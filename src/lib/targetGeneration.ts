// Deterministic Daily Target generator with optional LLM enrichment.
//
// Shared by the CLI (`scripts/generate-targets.ts`) and the "Regenerate"
// server action. The deterministic path always produces a valid queue;
// when USE_LLM=true, the top-N picks' whyNow/nextAction are polished by
// the LLM. Any LLM failure (network, parse, schema) leaves the rule-based
// text in place — the queue is never blocked by model availability.

import type { PrismaClient, RpcProvider } from "@prisma/client";
import { TargetStatus } from "./enums";
import { addDays, daysSince } from "./date";
import { prettifyProduct } from "./bdView";
import { enrichTargetPick, type TargetPickContext } from "./enrichment";
import { isLLMEnabled } from "./llm";
import { displacementScore } from "./rpc-providers";

const TOP_N = 10;

// ─── Scoring ──────────────────────────────────────────────────────────────────

// Weights sum to 1.00. Rebalanced from the original 4-component formula to
// reward accounts that are observably on a competitor RPC — the cleanest
// BD pitch surface Radar produces.
const W_ID = 0.25;
const W_FRESH = 0.25;
const W_IMPACT = 0.2;
const W_MATCH = 0.2;
const W_RPC = 0.1;

/** Calendar-day decay curve: 0d → 1.0, 30d → 0.0. */
export function freshnessFromDays(days: number | null): number {
  if (days === null) return 0;
  if (days <= 0) return 1.0;
  if (days <= 3) return 0.9;
  if (days <= 7) return 0.7;
  if (days <= 14) return 0.4;
  if (days <= 30) return 0.2;
  return 0;
}

export function matchClarity(
  primary: { matchScore: number } | null,
  top: { matchScore: number } | null
): number {
  if (primary) return primary.matchScore;
  if (top) return top.matchScore * 0.8;
  return 0;
}

export function compositeScore(parts: {
  id: number;
  fresh: number;
  impact: number;
  match: number;
  rpc?: number;
}): number {
  const rpc = parts.rpc ?? 0;
  return (
    W_ID * parts.id +
    W_FRESH * parts.fresh +
    W_IMPACT * parts.impact +
    W_MATCH * parts.match +
    W_RPC * rpc
  );
}

// ─── Copy rules ───────────────────────────────────────────────────────────────

const WHY_NOW_BY_TYPE: Record<string, (title: string) => string> = {
  FUNDING: (t) => `Fresh capital just landed (${t}); infra review window likely open.`,
  HIRING: (t) => `Team is ramping on infra (${t}); decision-makers are hiring around the pain.`,
  PRODUCT_LAUNCH: (t) => `Shipped "${t}" — peak-load exposure is imminent.`,
  ONCHAIN_ACTIVITY: (t) => `On-chain traction is climbing (${t}); RPC load pressure is real.`,
  PARTNERSHIP: (t) => `Ecosystem surface widening (${t}); integration-reliability buyer engaged.`,
  TECH_CHANGE: (t) => `Stack is moving (${t}); displacement window is open.`,
  SOCIAL: (t) => `Public frustration signal (${t}); act while pain is top-of-mind.`,
  PRESS: (t) => `In the news (${t}); easier warm intro than usual this week.`,
  TEAM_MOVE: (t) => `Key hire / departure (${t}); strategy reset likely underway.`,
  OTHER: (t) => `Recent movement: ${t}.`,
};

const NEXT_ACTION_BY_TYPE: Partial<Record<string, string>> = {
  FUNDING: "Intro to CTO positioning RPC + infra coverage post-raise.",
  HIRING: "Warm intro to head of platform eng; lead with reliability story.",
  PRODUCT_LAUNCH: "Offer a launch-readiness / load-review call this week.",
  ONCHAIN_ACTIVITY: "Share comparable RPC reliability benchmark; request infra review.",
  PARTNERSHIP: "Pitch Helius as the next integration surface.",
  TECH_CHANGE: "Lead displacement pitch; emphasize migration support.",
  SOCIAL: "Respond privately to the founder signal with a concrete offer.",
  PRESS: "Use mutual investor or press cycle as warm-intro vector.",
  TEAM_MOVE: "Re-open conversation with new decision-maker.",
};

export function buildWhyNow(
  latestSignal: { signalType: string; title: string } | null,
  identificationScore: number | null
): string {
  if (latestSignal) {
    const fn = WHY_NOW_BY_TYPE[latestSignal.signalType] ?? WHY_NOW_BY_TYPE.OTHER;
    return fn(latestSignal.title);
  }
  if ((identificationScore ?? 0) >= 0.8) {
    return "High-fit account with no fresh signal; candidate for proactive outreach.";
  }
  return "No recent signal — re-enrich or pause until new activity.";
}

export function buildNextAction(
  latestSignal: { signalType: string } | null,
  primaryProduct: string | null
): string {
  const bySignal = latestSignal
    ? NEXT_ACTION_BY_TYPE[latestSignal.signalType]
    : undefined;
  if (bySignal) return bySignal;
  if (primaryProduct) {
    return `Qualify fit for ${prettifyProduct(primaryProduct)} with an infra-owner intro.`;
  }
  return "Enrich account and confirm wedge hypothesis before outreach.";
}

export function pickRecommendedWedge(
  primaryProduct: string | null,
  topProduct: string | null,
  accountWedge: string | null
): string | null {
  if (primaryProduct) return prettifyProduct(primaryProduct);
  if (topProduct) return prettifyProduct(topProduct);
  return accountWedge;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export type GeneratedTarget = {
  accountId: string;
  companyName: string;
  score: number;
  breakdown: { id: number; fresh: number; impact: number; match: number; rpc: number };
  whyNow: string;
  nextAction: string;
  recommendedWedge: string | null;
  rpcProvider: RpcProvider | null;
};

export type GenerateResult = {
  targetDate: Date;
  considered: number;
  eligible: number;
  replaced: number;
  created: number;
  /** Number of picks whose copy was successfully upgraded by the LLM. */
  enriched: number;
  picks: GeneratedTarget[];
};

type PickWithContext = GeneratedTarget & { _ctx: TargetPickContext };

/**
 * Replace-all generation of DailyTargets for a given UTC-midnight date.
 * Idempotent: re-running for the same date with unchanged inputs produces
 * the same deterministic rows (LLM enrichment is non-deterministic by design).
 * Wrapped in a transaction so the queue can never be half-updated.
 */
export async function generateTargetsForDate(
  prisma: PrismaClient,
  targetDate: Date,
  now: Date = new Date()
): Promise<GenerateResult> {
  const accounts = await prisma.account.findMany({
    where: { trackStatus: "TRACKED" },
    select: {
      id: true,
      companyName: true,
      segment: true,
      identificationScore: true,
      recommendedWedge: true,
      rpcProvider: true,
      signals: {
        orderBy: { detectedAt: "desc" },
        take: 1,
        select: {
          signalType: true,
          title: true,
          detectedAt: true,
          impactScore: true,
        },
      },
      productMatches: {
        orderBy: [{ primaryMatch: "desc" }, { matchScore: "desc" }],
        select: { heliusProduct: true, matchScore: true, primaryMatch: true },
      },
    },
  });

  const picks: PickWithContext[] = accounts
    .map((a): PickWithContext | null => {
      const latestSignal = a.signals[0] ?? null;
      const primary = a.productMatches.find((m) => m.primaryMatch) ?? null;
      const top = a.productMatches[0] ?? null;
      const nonPrimaryTop = primary ? null : top;

      const id = a.identificationScore ?? 0;
      const fresh = freshnessFromDays(
        latestSignal ? daysSince(latestSignal.detectedAt, now) : null
      );
      const impact = latestSignal?.impactScore ?? 0;
      const match = matchClarity(primary, nonPrimaryTop);
      const rpc = displacementScore(a.rpcProvider);
      const score = compositeScore({ id, fresh, impact, match, rpc });
      if (score <= 0) return null;

      const whyNow = buildWhyNow(latestSignal, a.identificationScore);
      const nextAction = buildNextAction(latestSignal, primary?.heliusProduct ?? null);
      const recommendedWedge = pickRecommendedWedge(
        primary?.heliusProduct ?? null,
        top?.heliusProduct ?? null,
        a.recommendedWedge
      );

      return {
        accountId: a.id,
        companyName: a.companyName,
        score,
        breakdown: { id, fresh, impact, match, rpc },
        whyNow,
        nextAction,
        recommendedWedge,
        rpcProvider: a.rpcProvider,
        _ctx: {
          companyName: a.companyName,
          segment: a.segment,
          recommendedWedge,
          latestSignal,
          primaryMatch: primary
            ? { heliusProduct: primary.heliusProduct, matchScore: primary.matchScore }
            : null,
          rule: { whyNow, nextAction },
        },
      };
    })
    .filter((p): p is PickWithContext => p !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  // LLM enrichment — top-N only, parallel, per-pick failure tolerant.
  let enriched = 0;
  if (isLLMEnabled() && picks.length > 0) {
    const results = await Promise.allSettled(
      picks.map((p) => enrichTargetPick(p._ctx))
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        picks[i].whyNow = r.value.whyNow;
        picks[i].nextAction = r.value.nextAction;
        enriched++;
      }
    });
  }

  const tomorrow = addDays(targetDate, 1);

  const { replaced, created } = await prisma.$transaction(async (tx) => {
    const del = await tx.dailyTarget.deleteMany({
      where: { targetDate: { gte: targetDate, lt: tomorrow } },
    });
    if (picks.length === 0) {
      return { replaced: del.count, created: 0 };
    }
    await tx.dailyTarget.createMany({
      data: picks.map((p, i) => ({
        targetDate,
        accountId: p.accountId,
        priorityRank: i + 1,
        whyNow: p.whyNow,
        recommendedWedge: p.recommendedWedge,
        nextAction: p.nextAction,
        status: TargetStatus.OPEN,
      })),
    });
    return { replaced: del.count, created: picks.length };
  });

  // Strip internal context from the returned picks.
  const publicPicks: GeneratedTarget[] = picks.map(({ _ctx, ...rest }) => {
    void _ctx;
    return rest;
  });

  return {
    targetDate,
    considered: accounts.length,
    eligible: picks.length,
    replaced,
    created,
    enriched,
    picks: publicPicks,
  };
}

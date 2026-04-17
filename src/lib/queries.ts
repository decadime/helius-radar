// Shared Prisma queries.
//
// Pages import from here instead of reaching for the client directly, so the
// data surface stays auditable and each page component stays thin. Simple
// count/exists queries can stay inline — only extract shapes that are non-
// trivial or reused across pages.

import { prisma } from "./prisma";
import { Segment, TrackStatus } from "./enums";
import { addDays } from "./date";

// ─── Enum guards ──────────────────────────────────────────────────────────────

function isSegment(v: string): v is Segment {
  return (Object.values(Segment) as string[]).includes(v);
}
function isTrackStatus(v: string): v is TrackStatus {
  return (Object.values(TrackStatus) as string[]).includes(v);
}

// ─── Dashboard aggregates ─────────────────────────────────────────────────────

export type AccountCounts = {
  total: number;
  tracked: number;
  watchlist: number;
  rejected: number;
};

export async function getAccountCounts(): Promise<AccountCounts> {
  const [total, tracked, watchlist, rejected] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { trackStatus: TrackStatus.TRACKED } }),
    prisma.account.count({ where: { trackStatus: TrackStatus.WATCHLIST } }),
    prisma.account.count({ where: { trackStatus: TrackStatus.REJECTED } }),
  ]);
  return { total, tracked, watchlist, rejected };
}

export function getSignalsCountSince(since: Date) {
  return prisma.signal.count({ where: { detectedAt: { gte: since } } });
}

export function getRecentSignals(limit = 5) {
  return prisma.signal.findMany({
    orderBy: { detectedAt: "desc" },
    take: limit,
    include: { account: { select: { id: true, companyName: true } } },
  });
}

/** Top recommended wedges across accounts, by count. */
export async function getWedgeDistribution(limit = 8) {
  const groups = await prisma.account.groupBy({
    by: ["recommendedWedge"],
    where: { recommendedWedge: { not: null } },
    _count: { _all: true },
  });
  return groups
    .map((g) => ({ wedge: g.recommendedWedge as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Daily targets ────────────────────────────────────────────────────────────

/**
 * DailyTarget rows for a given UTC day, ordered by rank, with minimal account
 * fields included. The `date` argument must be UTC-midnight (see `todayUTC`).
 */
export function getTargetsForDate(date: Date, limit?: number) {
  return prisma.dailyTarget.findMany({
    where: { targetDate: { gte: date, lt: addDays(date, 1) } },
    orderBy: { priorityRank: "asc" },
    take: limit,
    select: {
      id: true,
      accountId: true,
      priorityRank: true,
      whyNow: true,
      recommendedWedge: true,
      nextAction: true,
      status: true,
      account: { select: { companyName: true, segment: true } },
    },
  });
}

// ─── Universe ─────────────────────────────────────────────────────────────────

export type UniverseFilters = {
  segment: Segment | null;
  status: TrackStatus | null;
  /** When true, only return accounts on a known Helius competitor RPC. */
  competitorRpc: boolean;
};

/** Allow-list filters against the enum so bad query strings never hit Prisma. */
export function normalizeUniverseFilters(raw: {
  segment?: string;
  status?: string;
  rpc?: string;
}): UniverseFilters {
  return {
    segment: raw.segment && isSegment(raw.segment) ? raw.segment : null,
    status: raw.status && isTrackStatus(raw.status) ? raw.status : null,
    competitorRpc: raw.rpc === "competitor",
  };
}

const COMPETITOR_RPC_PROVIDERS = [
  "ALCHEMY",
  "QUICKNODE",
  "SYNDICA",
  "TRITON",
  "SHYFT",
  "ANKR",
  "CHAINSTACK",
  "PUBLIC_SOLANA",
] as const;

export function getUniverse({ segment, status, competitorRpc }: UniverseFilters) {
  return prisma.account.findMany({
    where: {
      ...(segment ? { segment } : {}),
      ...(status ? { trackStatus: status } : {}),
      ...(competitorRpc
        ? { rpcProvider: { in: [...COMPETITOR_RPC_PROVIDERS] } }
        : {}),
    },
    orderBy: [
      { identificationScore: { sort: "desc", nulls: "last" } },
      { companyName: "asc" },
    ],
    select: {
      id: true,
      companyName: true,
      domain: true,
      segment: true,
      trackStatus: true,
      identificationScore: true,
      confidence: true,
      recommendedWedge: true,
      source: true,
      rpcProvider: true,
    },
  });
}

// ─── Tracked ──────────────────────────────────────────────────────────────────

export type TrackedFilters = { q: string | null; wedge: string | null };

export function getTrackedAccounts({ q, wedge }: TrackedFilters) {
  return prisma.account.findMany({
    where: {
      trackStatus: TrackStatus.TRACKED,
      // Postgres ILIKE via Prisma's case-insensitive mode — Unicode-safe.
      ...(q ? { companyName: { contains: q, mode: "insensitive" } } : {}),
      ...(wedge ? { recommendedWedge: wedge } : {}),
    },
    orderBy: [
      { identificationScore: { sort: "desc", nulls: "last" } },
      { companyName: "asc" },
    ],
    select: {
      id: true,
      companyName: true,
      segment: true,
      recommendedWedge: true,
      identificationScore: true,
      rpcProvider: true,
      signals: {
        orderBy: { detectedAt: "desc" },
        take: 1,
        select: { title: true, detectedAt: true },
      },
    },
  });
}

export async function getTrackedWedgeOptions(): Promise<string[]> {
  const rows = await prisma.account.findMany({
    where: {
      trackStatus: TrackStatus.TRACKED,
      recommendedWedge: { not: null },
    },
    distinct: ["recommendedWedge"],
    select: { recommendedWedge: true },
    orderBy: { recommendedWedge: "asc" },
  });
  return rows
    .map((r) => r.recommendedWedge)
    .filter((w): w is string => Boolean(w));
}

// ─── Account detail ───────────────────────────────────────────────────────────

/** Full account with all signals, product matches, and today's daily target. */
export function getAccountDetail(id: string, todayStart: Date) {
  return prisma.account.findUnique({
    where: { id },
    include: {
      signals: { orderBy: { detectedAt: "desc" } },
      productMatches: {
        orderBy: [{ primaryMatch: "desc" }, { matchScore: "desc" }],
      },
      dailyTargets: {
        where: { targetDate: { gte: todayStart, lt: addDays(todayStart, 1) } },
        take: 1,
      },
    },
  });
}

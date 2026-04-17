// Daily-target LLM enrichment.
//
// Takes a rule-based pick and asks the LLM to polish `whyNow` and
// `nextAction`. The rule-based pick is ALWAYS valid on its own; this layer
// only upgrades the copy. Any failure — network, schema drift, rate limit —
// returns null and the caller keeps the rule-based row.

import { z } from "zod";
import { callLLM } from "./llm";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const EnrichedTargetSchema = z.object({
  whyNow: z.string().trim().min(5).max(300),
  nextAction: z.string().trim().min(5).max(300),
});
export type EnrichedTarget = z.infer<typeof EnrichedTargetSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

// Kept in code (not loaded from prompts/agent/*.md) so there is no runtime
// file I/O and no deployment-path surprises. The markdown prompts remain the
// documentation contract for external agent runners; this string is the
// specific version wired into the `generate:targets` pipeline.
const SYSTEM_PROMPT = `You are polishing a single ranked BD target for Helius Radar, a GTM intelligence tool for Helius (Solana infrastructure: RPC, DAS, Webhooks, LaserStream, etc.).

You receive one target at a time, already scored and ranked by a deterministic system. Your job is to rewrite the "whyNow" and "nextAction" fields so they read sharper and more specific, grounded only in the evidence provided.

Return JSON only, no prose, no code fences. Shape:
{ "whyNow": string, "nextAction": string }

Rules:
1. whyNow: 1–2 sentences, ≤ 200 characters. Name the specific recent event. Do not editorialize.
2. nextAction: imperative voice, ≤ 200 characters, concrete enough for a BD rep to execute today.
3. Ground every claim in the input. Never invent funding amounts, team members, or usage stats.
4. If the input signal is weak or stale, say so plainly rather than manufacturing urgency.
5. Keep Helius product references accurate. Valid product display names only: Solana RPC, Dedicated Nodes, Sender, Shred Delivery, LaserStream, Enhanced WebSockets, Webhooks, DAS API, Enhanced Transactions, Priority Fee API, Wallet API, ZK Compression. Never invent products like "MEV Protect", "Staked RPC", or "Shield" — those do not exist.`;

// ─── Public types ─────────────────────────────────────────────────────────────

export type TargetPickContext = {
  companyName: string;
  segment: string;
  recommendedWedge: string | null;
  latestSignal: {
    signalType: string;
    title: string;
    detectedAt: Date;
    impactScore: number | null;
  } | null;
  primaryMatch: { heliusProduct: string; matchScore: number } | null;
  rule: { whyNow: string; nextAction: string };
};

// ─── Public entry point ───────────────────────────────────────────────────────

export async function enrichTargetPick(
  ctx: TargetPickContext
): Promise<EnrichedTarget | null> {
  const userPrompt = buildUserPrompt(ctx);
  return callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: EnrichedTargetSchema,
  });
}

// ─── User-prompt builder (exported for test introspection) ───────────────────

export function buildUserPrompt(ctx: TargetPickContext): string {
  const lines: string[] = [];
  lines.push(`Company: ${ctx.companyName}`);
  lines.push(`Segment: ${ctx.segment}`);
  if (ctx.recommendedWedge) {
    lines.push(`Recommended wedge: ${ctx.recommendedWedge}`);
  }
  if (ctx.primaryMatch) {
    lines.push(
      `Primary Helius product match: ${ctx.primaryMatch.heliusProduct} ` +
        `(score ${ctx.primaryMatch.matchScore.toFixed(2)})`
    );
  }
  if (ctx.latestSignal) {
    const impact =
      ctx.latestSignal.impactScore !== null
        ? ` [impact ${ctx.latestSignal.impactScore.toFixed(2)}]`
        : "";
    lines.push(
      `Latest signal: ${ctx.latestSignal.signalType} — ` +
        `"${ctx.latestSignal.title}" on ${ctx.latestSignal.detectedAt
          .toISOString()
          .slice(0, 10)}${impact}`
    );
  } else {
    lines.push("Latest signal: (none)");
  }
  lines.push("");
  lines.push("Current deterministic copy (replace with sharper versions):");
  lines.push(`  whyNow: ${ctx.rule.whyNow}`);
  lines.push(`  nextAction: ${ctx.rule.nextAction}`);
  lines.push("");
  lines.push('Return JSON: { "whyNow": "...", "nextAction": "..." }');
  return lines.join("\n");
}

// LLM-based portfolio extraction. One code path for all VC sites.
//
// The prompt asks the model to:
//   1. Extract company entries it sees
//   2. Flag Solana relevance explicitly (not just "might be crypto")
//   3. Keep description factual — no invention
//
// Output is pre-filtered to Solana-relevant rows before it lands in the
// candidate import file. Non-Solana entries are dropped at extraction time
// so we don't ship the filter downstream.

import { z } from "zod";
import { callLLM } from "../llm";
import { Segment } from "../enums";

export const PortfolioCompanySchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(120).nullable(),
  description: z.string().trim().min(1).max(400).nullable(),
  segment: z.string().trim().min(1).max(40),
  solanaConfidence: z.number().min(0).max(1),
});
export type PortfolioCompany = z.infer<typeof PortfolioCompanySchema>;

export const ExtractionResultSchema = z.object({
  companies: z.array(PortfolioCompanySchema).max(200),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const ALLOWED_SEGMENTS = (Object.values(Segment) as string[]).join(", ");

const SYSTEM_PROMPT = `You are extracting companies from a venture capital firm's portfolio page for Helius Radar, a GTM tool for Helius (Solana RPC + data infrastructure).

Goal: produce a JSON object with a single key "companies" — an array of companies that plausibly build on Solana.

Rules:
1. Only include companies that appear to build on Solana (first-party or multi-chain with Solana coverage). Drop Ethereum-only, BTC-only, TradFi, general AI, general SaaS.
2. For each company, set "solanaConfidence" in [0, 1]:
   - 0.9+ = page explicitly names Solana in the description or logo/tag area
   - 0.7–0.9 = strong signal (DeFi/NFT/wallet/infra on Solana by context) without explicit naming
   - 0.5–0.7 = unclear but plausible given segment
   - Below 0.5 = drop it
3. "segment" must be one of: ${ALLOWED_SEGMENTS}. If unsure use OTHER.
4. "companyName" is the canonical display name. Strip "(seed)", "(Series A)", emoji, etc.
5. "domain" is the raw domain without protocol / www / path (e.g. "jup.ag"). Null if not linked.
6. "description" is one verifiable sentence from the page. Do not invent. Null if nothing is given.
7. Return JSON only. No markdown fences, no prose. Shape:
   { "companies": [ { "companyName": "...", "domain": "...", "description": "...", "segment": "DEX", "solanaConfidence": 0.9 }, ... ] }
8. If the page clearly doesn't contain a portfolio, return { "companies": [] }. Don't guess.`;

export async function extractPortfolio(input: {
  vcName: string;
  sourceUrl: string;
  condensedHtml: string;
}): Promise<ExtractionResult | null> {
  const userPrompt =
    `VC: ${input.vcName}\n` +
    `Source URL: ${input.sourceUrl}\n\n` +
    `Page content (condensed HTML):\n${input.condensedHtml}\n\n` +
    `Return JSON: { "companies": [...] }`;

  return callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: ExtractionResultSchema,
    // Extraction can handle a bit more slack than enrichment — the output
    // shape is bigger, more variance is expected across VC pages.
    maxAttempts: 2,
  });
}

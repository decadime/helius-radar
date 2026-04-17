// RPC provider metadata — single source of truth for detection, display,
// and scoring. Keep this file aligned with the `RpcProvider` enum in
// prisma/schema.prisma.

import { RpcProvider } from "./enums";

export type ProviderMeta = {
  provider: RpcProvider;
  display: string;
  /** URL-shaped regex patterns searched against fetched frontend bundles. */
  patterns: RegExp[];
};

/**
 * Ordered detection table. More specific patterns come first so that
 * e.g. Alchemy's `solana-mainnet.g.alchemy.com` matches before any
 * generic fallback.
 *
 * Patterns are intentionally URL-fragment regexes, not full URLs — frontend
 * bundles often have provider hostnames embedded mid-string with query-
 * string API keys concatenated. Matching the hostname fragment is enough.
 */
export const PROVIDER_PATTERNS: ProviderMeta[] = [
  {
    provider: RpcProvider.HELIUS,
    display: "Helius",
    patterns: [/helius-rpc\.com/i, /api\.helius\.xyz/i, /mainnet\.helius/i],
  },
  {
    provider: RpcProvider.ALCHEMY,
    display: "Alchemy",
    patterns: [
      /solana-mainnet\.g\.alchemy\.com/i,
      /solana-devnet\.g\.alchemy\.com/i,
      /alchemy\.com\/v2/i,
    ],
  },
  {
    provider: RpcProvider.QUICKNODE,
    display: "QuickNode",
    patterns: [/solana-mainnet\.quiknode\.pro/i, /\.quiknode\.pro/i],
  },
  {
    provider: RpcProvider.SYNDICA,
    display: "Syndica",
    patterns: [/solana-mainnet\.api\.syndica\.io/i, /\.syndica\.io/i],
  },
  {
    provider: RpcProvider.TRITON,
    display: "Triton",
    patterns: [/\.rpcpool\.com/i, /triton\.one/i],
  },
  {
    provider: RpcProvider.SHYFT,
    display: "Shyft",
    patterns: [/rpc\.shyft\.to/i, /api\.shyft\.to/i],
  },
  {
    provider: RpcProvider.ANKR,
    display: "Ankr",
    patterns: [/rpc\.ankr\.com\/solana/i, /rpc\.ankr\.com\/multichain/i],
  },
  {
    provider: RpcProvider.CHAINSTACK,
    display: "Chainstack",
    patterns: [/\.p2pify\.com/i, /\.chainstack\.com/i],
  },
  {
    provider: RpcProvider.PUBLIC_SOLANA,
    display: "Public Solana endpoint",
    patterns: [
      /api\.mainnet-beta\.solana\.com/i,
      /api\.devnet\.solana\.com/i,
      /api\.testnet\.solana\.com/i,
    ],
  },
];

const DISPLAY_MAP = new Map<RpcProvider, string>(
  PROVIDER_PATTERNS.map((p) => [p.provider, p.display])
);

export function providerDisplay(provider: RpcProvider | null | undefined): string {
  if (!provider) return "Not scanned";
  if (provider === RpcProvider.PROXIED) return "Proxied (unknown)";
  if (provider === RpcProvider.UNKNOWN) return "Unknown";
  if (provider === RpcProvider.OTHER) return "Other";
  return DISPLAY_MAP.get(provider) ?? provider;
}

/**
 * Detect a provider by scanning a string (e.g. a concatenated bundle) for
 * known URL patterns. Returns the highest-precedence match.
 *
 * Special case: if the only match is HELIUS, returns HELIUS (existing
 * customer). If both HELIUS and a competitor appear, the competitor wins
 * — teams on the way out often still have our URL hanging around in an
 * old code path.
 */
export function detectProviderInBundle(content: string): RpcProvider | null {
  let heliusMatch = false;
  for (const { provider, patterns } of PROVIDER_PATTERNS) {
    for (const p of patterns) {
      if (p.test(content)) {
        if (provider === RpcProvider.HELIUS) {
          heliusMatch = true;
          break; // keep searching for competitor patterns
        }
        return provider;
      }
    }
  }
  return heliusMatch ? RpcProvider.HELIUS : null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const COMPETITORS = new Set<RpcProvider>([
  RpcProvider.ALCHEMY,
  RpcProvider.QUICKNODE,
  RpcProvider.SYNDICA,
  RpcProvider.TRITON,
  RpcProvider.SHYFT,
  RpcProvider.ANKR,
  RpcProvider.CHAINSTACK,
  RpcProvider.PUBLIC_SOLANA,
]);

export function isCompetitorProvider(provider: RpcProvider | null | undefined): boolean {
  return provider !== null && provider !== undefined && COMPETITORS.has(provider);
}

/**
 * Displacement score for the BD target ranker. A competitor RPC is the
 * single cleanest pitch surface we have — it's explicit 1:1 displacement.
 *
 *   Competitor on a public / paid competitor endpoint   → 1.00
 *   Unknown (scanned, no match — likely server-side)    → 0.30
 *   Not scanned yet                                     → 0.30
 *   Proxied (own domain, underlying provider hidden)    → 0.20
 *   HELIUS (existing customer)                          → 0.00
 */
export function displacementScore(provider: RpcProvider | null | undefined): number {
  if (!provider) return 0.3;
  if (isCompetitorProvider(provider)) return 1.0;
  if (provider === RpcProvider.UNKNOWN) return 0.3;
  if (provider === RpcProvider.PROXIED) return 0.2;
  if (provider === RpcProvider.HELIUS) return 0.0;
  return 0.3;
}

export { RpcProvider };

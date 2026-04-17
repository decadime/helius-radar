/**
 * Discover Solana DeFi protocols via DefiLlama's public API.
 *
 * Free, unauth'd, Solana-filtered. The hit rate is high because DefiLlama
 * tracks TVL per protocol — anything above the threshold is a real production
 * system, not vaporware.
 *
 * Usage:
 *   npm run discover:defillama                          # TVL >= $1M
 *   npm run discover:defillama -- --min-tvl=100000      # custom threshold
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  dedupeCandidates,
  normalizeDomain,
  clampScore,
  type CandidateImportRow,
} from "../src/lib/discovery/normalize";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

const OUTPUT_PATH = "data/imports/candidates.defillama.json";
const DEFILLAMA_PROTOCOLS_URL = "https://api.llama.fi/protocols";
const DEFAULT_MIN_TVL = 1_000_000;

// Categories that are not BD candidates even when they appear on Solana's TVL
// list. CEXes custody Solana (Binance, OKX, Bybit, etc.) but they don't
// build on Solana and won't buy infra from Helius. Chains and "RWA" wrappers
// similarly show up as TVL holders without being targets.
const EXCLUDED_CATEGORIES = new Set<string>([
  "CEX",
  "Chain",
  "Indexes",
  "Reserve Currency",
  "Wrappers",
]);

// DefiLlama protocol shape (subset we care about).
type DefiLlamaProtocol = {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
  chain?: string | null;
  chains?: string[];
  category?: string | null;
  tvl?: number | null;
  twitter?: string | null;
};

function parseMinTvl(argv: string[]): number {
  for (const a of argv.slice(2)) {
    if (a.startsWith("--min-tvl=")) {
      const n = Number(a.slice("--min-tvl=".length));
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return DEFAULT_MIN_TVL;
}

/** Map DefiLlama category text to our Segment enum. */
function mapCategory(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (!c) return "OTHER";
  if (c.includes("dex")) return "DEX";
  if (c.includes("aggregator")) return "DEX";
  if (c.includes("perp") || c.includes("derivative") || c.includes("option")) return "TRADING";
  if (c.includes("lending") || c.includes("cdp")) return "DEFI";
  if (c.includes("yield") || c.includes("farm") || c.includes("vault")) return "DEFI";
  if (c.includes("liquid staking") || c.includes("staking")) return "DEFI";
  if (c.includes("stablecoin")) return "STABLECOIN";
  if (c.includes("payments")) return "PAYMENTS";
  if (c.includes("rwa") || c.includes("real world")) return "RWA";
  if (c.includes("nft")) return "NFT";
  if (c.includes("gaming") || c.includes("game")) return "GAMING";
  if (c.includes("wallet")) return "WALLET";
  if (c.includes("oracle") || c.includes("bridge") || c.includes("infra")) return "INFRA";
  return "OTHER";
}

function confidenceFromTvl(tvl: number): number {
  if (tvl >= 100_000_000) return 0.95;
  if (tvl >= 10_000_000) return 0.9;
  if (tvl >= 1_000_000) return 0.82;
  return 0.7;
}

async function fetchProtocols(): Promise<DefiLlamaProtocol[]> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(DEFILLAMA_PROTOCOLS_URL, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`DefiLlama HTTP ${res.status}`);
    const json = (await res.json()) as DefiLlamaProtocol[];
    if (!Array.isArray(json)) throw new Error("DefiLlama returned non-array payload");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const start = Date.now();
  const minTvl = parseMinTvl(process.argv);

  console.log(`\n→ Fetching DefiLlama protocols (min TVL: $${minTvl.toLocaleString()})\n`);

  let protocols: DefiLlamaProtocol[];
  try {
    protocols = await fetchProtocols();
  } catch (err) {
    const message = (err as Error).message;
    console.error(`\n✗ DefiLlama fetch failed: ${message}\n`);
    await writeRunLog(prisma, {
      runType: "CANDIDATE_DISCOVERY",
      outcome: "FAILURE",
      summary: "DefiLlama fetch failed",
      durationMs: Date.now() - start,
      errorMessage: message,
    });
    process.exit(1);
  }

  const onSolana = protocols.filter(
    (p) =>
      (p.chains?.includes("Solana") || p.chain === "Solana") &&
      typeof p.tvl === "number" &&
      p.tvl >= minTvl
  );
  const solana = onSolana.filter(
    (p) => !p.category || !EXCLUDED_CATEGORIES.has(p.category)
  );
  const excludedCount = onSolana.length - solana.length;

  const rows: CandidateImportRow[] = solana.map((p) => {
    const tvl = p.tvl ?? 0;
    const confidence = confidenceFromTvl(tvl);
    const descParts: string[] = [];
    if (p.description) descParts.push(p.description);
    descParts.push(`DefiLlama TVL: $${Math.round(tvl).toLocaleString()}.`);
    return {
      companyName: p.name,
      domain: normalizeDomain(p.url),
      segment: mapCategory(p.category),
      subsegment: p.category ?? null,
      description: descParts.join(" "),
      trackStatus: "CANDIDATE",
      identificationScore: clampScore(confidence * 0.95),
      confidence: clampScore(confidence),
      heliusFitSummary: null,
      recommendedWedge: null,
      source: "defillama",
      sourceUrl: p.url ?? null,
    };
  });

  const deduped = dedupeCandidates(rows);

  mkdirSync(resolve(process.cwd(), "data/imports"), { recursive: true });
  const outPath = resolve(process.cwd(), OUTPUT_PATH);
  writeFileSync(outPath, JSON.stringify(deduped, null, 2) + "\n");

  console.log(`  protocols fetched           ${protocols.length}`);
  console.log(`  Solana + >= TVL threshold   ${onSolana.length}`);
  console.log(`  excluded (CEX/Chain/etc)    ${excludedCount}`);
  console.log(`  candidates after dedupe     ${deduped.length}`);
  console.log(`\n  → wrote ${outPath}`);
  console.log(`  Next: npm run import:candidates -- ${OUTPUT_PATH}\n`);

  await writeRunLog(prisma, {
    runType: "CANDIDATE_DISCOVERY",
    outcome: "SUCCESS",
    summary: `DefiLlama: ${deduped.length} Solana protocols above $${minTvl.toLocaleString()} TVL`,
    inserted: deduped.length,
    durationMs: Date.now() - start,
    sourcePath: OUTPUT_PATH,
  });
}

main()
  .catch(async (err) => {
    console.error("\n✗ DefiLlama discovery failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

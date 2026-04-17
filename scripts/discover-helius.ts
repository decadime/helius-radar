/**
 * Helius-native on-chain discovery.
 *
 * Phase 1 scope: sample recent compressed-NFT authorities via the DAS API.
 * The authority of a cNFT collection is typically the issuing team's wallet,
 * which means recurring authorities across many cNFTs in a sample are real
 * Solana teams — often game studios, consumer apps, or on-chain loyalty
 * programs that DefiLlama doesn't cover.
 *
 * This is intentionally narrow. Broader on-chain discovery (new program
 * deployments, program-interaction graphs) belongs in Phase 2 once an
 * indexer strategy is chosen (Dune / Flipside / custom).
 *
 * Usage:
 *   npm run discover:helius                              # sample 5 pages = 500 assets
 *   npm run discover:helius -- --pages=10 --top=50       # more coverage
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  clampScore,
  type CandidateImportRow,
} from "../src/lib/discovery/normalize";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

const OUTPUT_PATH = "data/imports/candidates.helius.json";
const DEFAULT_PAGES = 5;
const DEFAULT_TOP = 25;
const PAGE_SIZE = 100;

// Known marketplace / protocol authorities to exclude from "discovered"
// results — these are not themselves BD candidates for the purposes of
// candidate universe expansion.
const EXCLUDED_AUTHORITIES = new Set<string>([
  // Add well-known aggregator/marketplace authority addresses here over time.
]);

type Args = { pages: number; top: number };

function parseArgs(argv: string[]): Args {
  let pages = DEFAULT_PAGES;
  let top = DEFAULT_TOP;
  for (const a of argv.slice(2)) {
    if (a.startsWith("--pages=")) {
      const n = Number(a.slice("--pages=".length));
      if (Number.isFinite(n) && n > 0) pages = Math.min(20, n);
    } else if (a.startsWith("--top=")) {
      const n = Number(a.slice("--top=".length));
      if (Number.isFinite(n) && n > 0) top = Math.min(200, n);
    }
  }
  return { pages, top };
}

type Asset = {
  id: string;
  authorities?: Array<{ address: string; scopes?: string[] }>;
  creators?: Array<{ address: string; share?: number; verified?: boolean }>;
  content?: {
    metadata?: { name?: string; symbol?: string };
    links?: { external_url?: string };
  };
};

type SearchAssetsResponse = {
  result?: { items: Asset[]; total?: number };
  error?: { message: string };
};

async function searchAssets(
  rpcUrl: string,
  page: number
): Promise<Asset[]> {
  const body = {
    jsonrpc: "2.0",
    id: `helius-discovery-${page}`,
    method: "searchAssets",
    params: {
      compressed: true,
      page,
      limit: PAGE_SIZE,
    },
  };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Helius RPC HTTP ${res.status} on page ${page}`);
  }
  const json = (await res.json()) as SearchAssetsResponse;
  if (json.error) {
    throw new Error(`Helius RPC error on page ${page}: ${json.error.message}`);
  }
  return json.result?.items ?? [];
}

type AuthorityAggregate = {
  address: string;
  cnftCount: number;
  sampleNames: Set<string>;
  sampleExternalUrls: Set<string>;
};

async function main() {
  const start = Date.now();
  const args = parseArgs(process.argv);

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    const msg =
      "HELIUS_API_KEY is not set. Get a free key at https://dashboard.helius.dev " +
      "and add HELIUS_API_KEY=... to .env.";
    console.error(`\n✗ ${msg}\n`);
    await writeRunLog(prisma, {
      runType: "CANDIDATE_DISCOVERY",
      outcome: "FAILURE",
      summary: "Helius discovery skipped — no API key",
      durationMs: Date.now() - start,
      errorMessage: msg,
    });
    process.exit(1);
  }

  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  console.log(
    `\n→ Helius DAS discovery: sampling ${args.pages} page(s) × ${PAGE_SIZE} compressed assets\n`
  );

  const aggregates = new Map<string, AuthorityAggregate>();
  let sampledAssets = 0;

  for (let page = 1; page <= args.pages; page++) {
    const items = await searchAssets(rpcUrl, page);
    sampledAssets += items.length;
    console.log(`  page ${page}: ${items.length} assets`);
    if (items.length === 0) break;
    for (const asset of items) {
      const authority = asset.authorities?.[0]?.address;
      if (!authority || EXCLUDED_AUTHORITIES.has(authority)) continue;
      let agg = aggregates.get(authority);
      if (!agg) {
        agg = {
          address: authority,
          cnftCount: 0,
          sampleNames: new Set(),
          sampleExternalUrls: new Set(),
        };
        aggregates.set(authority, agg);
      }
      agg.cnftCount++;
      const name = asset.content?.metadata?.name?.trim();
      if (name) agg.sampleNames.add(name);
      const url = asset.content?.links?.external_url?.trim();
      if (url) agg.sampleExternalUrls.add(url);
    }
  }

  const ranked = [...aggregates.values()]
    .filter((a) => a.cnftCount >= 2) // seen at least twice = not a one-off mint
    .sort((a, b) => b.cnftCount - a.cnftCount)
    .slice(0, args.top);

  // Exclude authorities matching any existing Account (by address prefix in
  // source/sourceUrl, or by domain match from sampled URLs).
  const knownDomains = new Set(
    (
      await prisma.account.findMany({
        where: { domain: { not: null } },
        select: { domain: true },
      })
    ).flatMap((a) => (a.domain ? [a.domain] : []))
  );

  const rows: CandidateImportRow[] = [];
  for (const a of ranked) {
    // Derive a candidate domain from sampled external URLs (cNFT metadata
    // often points back to the issuing team's site).
    const candidateDomain = pickCandidateDomain(a.sampleExternalUrls);
    if (candidateDomain && knownDomains.has(candidateDomain)) continue;

    const bestName =
      pickCandidateName(a.sampleNames) ??
      `On-chain authority ${a.address.slice(0, 6)}…${a.address.slice(-4)}`;

    const confidence = scoreConfidence(a.cnftCount, args.pages * PAGE_SIZE);

    rows.push({
      companyName: bestName,
      domain: candidateDomain,
      segment: "GAMING", // cNFT-heavy workloads are most often gaming / consumer
      subsegment: "cNFT authority",
      description:
        `Discovered via Helius DAS. Authority ${a.address} issued ` +
        `${a.cnftCount} compressed NFT(s) in a ${args.pages * PAGE_SIZE}-asset sample.`,
      trackStatus: "CANDIDATE",
      identificationScore: clampScore(confidence * 0.85),
      confidence: clampScore(confidence),
      heliusFitSummary:
        "cNFT-heavy issuance pattern — DAS API + ZK Compression are the natural wedge.",
      recommendedWedge: "DAS API",
      source: "helius-das",
      sourceUrl: null,
    });
  }

  mkdirSync(resolve(process.cwd(), "data/imports"), { recursive: true });
  const outPath = resolve(process.cwd(), OUTPUT_PATH);
  writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");

  console.log(`\n  assets sampled         ${sampledAssets}`);
  console.log(`  unique authorities     ${aggregates.size}`);
  console.log(`  ranked (>= 2 cNFTs)    ${ranked.length}`);
  console.log(`  candidates emitted     ${rows.length}`);
  console.log(`\n  → wrote ${outPath}`);
  console.log(`  Next: npm run import:candidates -- ${OUTPUT_PATH}\n`);

  await writeRunLog(prisma, {
    runType: "CANDIDATE_DISCOVERY",
    outcome: "SUCCESS",
    summary: `Helius DAS: sampled ${sampledAssets} assets, ${rows.length} candidates`,
    inserted: rows.length,
    durationMs: Date.now() - start,
    sourcePath: OUTPUT_PATH,
  });
}

function pickCandidateDomain(urls: Set<string>): string | null {
  for (const raw of urls) {
    try {
      const u = new URL(raw);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      // Skip gateways / CDNs that are not the issuing team's domain.
      if (/\.arweave\.net$/.test(host)) continue;
      if (/\.ipfs\.io$/.test(host) || /^ipfs\./.test(host)) continue;
      if (/pinata\.cloud$/.test(host)) continue;
      if (/googleusercontent\.com$/.test(host)) continue;
      if (/amazonaws\.com$/.test(host)) continue;
      if (/cloudflare-ipfs\.com$/.test(host)) continue;
      return host;
    } catch {
      continue;
    }
  }
  return null;
}

function pickCandidateName(names: Set<string>): string | null {
  // A cNFT authority usually mints many NFTs with shared prefixes like
  // "CollectionX #1", "CollectionX #2". We try to find the common prefix.
  const arr = [...names];
  if (arr.length === 0) return null;
  if (arr.length === 1) return arr[0];
  const prefix = commonPrefix(arr);
  if (prefix && prefix.length >= 4) return prefix.replace(/[\s\-#:]+$/, "").trim();
  return arr[0];
}

function commonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  let p = strs[0];
  for (let i = 1; i < strs.length && p.length > 0; i++) {
    while (!strs[i].startsWith(p)) {
      p = p.slice(0, -1);
      if (p.length === 0) return "";
    }
  }
  return p;
}

function scoreConfidence(cnftCount: number, sampleSize: number): number {
  // Heuristic: higher share of the sample → higher confidence this is a
  // meaningful issuer rather than a one-off wallet.
  const share = cnftCount / Math.max(1, sampleSize);
  if (share >= 0.05) return 0.85;
  if (share >= 0.02) return 0.75;
  if (share >= 0.01) return 0.65;
  return 0.55;
}

main()
  .catch(async (err) => {
    console.error("\n✗ Helius discovery failed:", err);
    await writeRunLog(prisma, {
      runType: "CANDIDATE_DISCOVERY",
      outcome: "FAILURE",
      summary: "Helius discovery failed",
      durationMs: 0,
      errorMessage: (err as Error).message,
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

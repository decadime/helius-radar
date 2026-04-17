/**
 * Discover Solana-relevant candidate accounts by LLM-extracting VC portfolio
 * pages. One code path for all VCs — the model is the parser.
 *
 * Phase 1 scope:
 *   - Static-HTML fetch only (no Playwright yet)
 *   - LLM extraction + zod validation
 *   - Writes a single deduped candidates JSON that `import:candidates` picks up
 *
 * Usage:
 *   npm run discover:vcs                      # solana-relevant VCs only
 *   npm run discover:vcs -- --all             # include general-tech funds too
 *   npm run discover:vcs -- --only=multicoin,variant
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { getVcSources, type VcSource } from "../src/lib/discovery/vc-list";
import { fetchHtml, looksJsHeavy, condenseForLLM } from "../src/lib/discovery/fetch";
import { extractPortfolio } from "../src/lib/discovery/extract";
import {
  dedupeCandidates,
  normalizeDomain,
  sanitizeSegment,
  clampScore,
  type CandidateImportRow,
} from "../src/lib/discovery/normalize";
import { assertLLMConfigured } from "../src/lib/llm";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

const OUTPUT_PATH = "data/imports/candidates.vcs.json";
const MIN_SOLANA_CONFIDENCE = 0.6;

type Args = { all: boolean; only: string[] | null };

function parseArgs(argv: string[]): Args {
  let all = false;
  let only: string[] | null = null;
  for (const a of argv.slice(2)) {
    if (a === "--all") all = true;
    else if (a.startsWith("--only=")) {
      only = a
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return { all, only };
}

function selectSources(args: Args): VcSource[] {
  const base = getVcSources({ all: args.all });
  if (!args.only) return base;
  const only = new Set(args.only);
  return base.filter((v) => only.has(v.slug));
}

type PerVcResult = {
  vc: VcSource;
  url: string;
  status: "extracted" | "skipped-js-heavy" | "skipped-fetch-failed" | "skipped-empty";
  companyCount: number;
  reason?: string;
};

async function discoverOne(vc: VcSource): Promise<{
  result: PerVcResult;
  rows: CandidateImportRow[];
}> {
  const url = vc.portfolioUrl ?? vc.homepage;

  const fetched = await fetchHtml(url);
  if (!fetched.ok) {
    return {
      result: {
        vc,
        url,
        status: "skipped-fetch-failed",
        companyCount: 0,
        reason: fetched.reason,
      },
      rows: [],
    };
  }

  if (looksJsHeavy(fetched.html)) {
    return {
      result: {
        vc,
        url,
        status: "skipped-js-heavy",
        companyCount: 0,
        reason: "likely client-rendered SPA; needs Playwright",
      },
      rows: [],
    };
  }

  const condensed = condenseForLLM(fetched.html);
  const extracted = await extractPortfolio({
    vcName: vc.name,
    sourceUrl: url,
    condensedHtml: condensed,
  });

  if (!extracted) {
    return {
      result: {
        vc,
        url,
        status: "skipped-empty",
        companyCount: 0,
        reason: "LLM returned null after retry",
      },
      rows: [],
    };
  }

  const rows: CandidateImportRow[] = extracted.companies
    .filter((c) => c.solanaConfidence >= MIN_SOLANA_CONFIDENCE)
    .map((c) => ({
      companyName: c.companyName,
      domain: normalizeDomain(c.domain),
      segment: sanitizeSegment(c.segment),
      subsegment: null,
      description: c.description,
      trackStatus: "CANDIDATE",
      identificationScore: clampScore(c.solanaConfidence * 0.9),
      confidence: clampScore(c.solanaConfidence),
      heliusFitSummary: null,
      recommendedWedge: null,
      source: `vc:${vc.slug}`,
      sourceUrl: url,
    }));

  return {
    result: { vc, url, status: "extracted", companyCount: rows.length },
    rows,
  };
}

async function main() {
  const start = Date.now();
  const args = parseArgs(process.argv);
  const sources = selectSources(args);

  assertLLMConfigured();

  if (sources.length === 0) {
    console.error("\n✗ No sources selected. Check --only filter.\n");
    process.exit(1);
  }

  console.log(`\n→ Discovering candidates from ${sources.length} VC source(s)\n`);

  const results: PerVcResult[] = [];
  const allRows: CandidateImportRow[] = [];

  for (const vc of sources) {
    const { result, rows } = await discoverOne(vc);
    results.push(result);
    allRows.push(...rows);
    const label = result.status.padEnd(24, " ");
    console.log(
      `  ${label} ${vc.slug.padEnd(20, " ")} ${result.companyCount} companies` +
        (result.reason ? `   (${result.reason})` : "")
    );
  }

  const deduped = dedupeCandidates(allRows);

  // Write output
  mkdirSync(resolve(process.cwd(), "data/imports"), { recursive: true });
  const outPath = resolve(process.cwd(), OUTPUT_PATH);
  writeFileSync(outPath, JSON.stringify(deduped, null, 2) + "\n");

  const extractedCount = results.filter((r) => r.status === "extracted").length;
  const skippedCount = results.length - extractedCount;

  console.log(`\n  VCs processed          ${results.length}`);
  console.log(`  VCs extracted          ${extractedCount}`);
  console.log(`  VCs skipped            ${skippedCount}`);
  console.log(`  candidates extracted   ${allRows.length}`);
  console.log(`  candidates deduped     ${deduped.length}`);
  console.log(`\n  → wrote ${outPath}`);
  console.log(`  Next: npm run import:candidates -- ${OUTPUT_PATH}\n`);

  await writeRunLog(prisma, {
    runType: "CANDIDATE_DISCOVERY",
    outcome: skippedCount === 0 ? "SUCCESS" : "PARTIAL",
    summary:
      `VCs: ${results.length} processed, ${extractedCount} extracted. ` +
      `Candidates: ${deduped.length} deduped.`,
    inserted: deduped.length,
    skipped: skippedCount,
    durationMs: Date.now() - start,
    sourcePath: OUTPUT_PATH,
  });
}

main()
  .catch(async (err) => {
    console.error("\n✗ VC discovery failed:", err);
    await writeRunLog(prisma, {
      runType: "CANDIDATE_DISCOVERY",
      outcome: "FAILURE",
      summary: "VC discovery failed",
      durationMs: 0,
      errorMessage: (err as Error).message,
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Import candidate accounts from a local JSON file.
 *
 * Usage:
 *   npm run import:candidates                                  # default sample
 *   npm run import:candidates -- data/imports/my-list.json     # explicit path
 *
 * Dedupe key:
 *   1. `domain` if present (schema-enforced unique)
 *   2. otherwise first existing row with the same `companyName`
 *
 * Rows that fail minimum requirements are skipped with a reason; nothing
 * aborts the whole run. One RunLog row is appended per invocation.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, Segment, TrackStatus } from "@prisma/client";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

const DEFAULT_PATH = "data/imports/candidates.sample.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawRow = Record<string, unknown>;

type NormalizedRow = {
  companyName: string;
  domain: string | null;
  segment: Segment;
  subsegment: string | null;
  description: string | null;
  trackStatus: TrackStatus;
  identificationScore: number | null;
  confidence: number | null;
  heliusFitSummary: string | null;
  recommendedWedge: string | null;
  source: string | null;
  sourceUrl: string | null;
};

// ─── Normalization helpers ────────────────────────────────────────────────────

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
}

function cleanDomain(v: unknown): string | null {
  const s = cleanString(v);
  if (!s) return null;
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function cleanScore(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function cleanEnum<T extends string>(
  v: unknown,
  members: Readonly<Record<string, T>>
): T | null {
  const s = cleanString(v);
  if (!s) return null;
  const upper = s.toUpperCase();
  return (Object.values(members) as string[]).includes(upper)
    ? (upper as T)
    : null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

type ParseResult =
  | { ok: true; value: NormalizedRow }
  | { ok: false; reason: string };

function parseRow(raw: RawRow): ParseResult {
  const companyName = cleanString(raw.companyName);
  if (!companyName) return { ok: false, reason: "missing companyName" };

  const segment = cleanEnum(raw.segment, Segment);
  if (!segment) {
    return {
      ok: false,
      reason: `invalid segment "${String(raw.segment ?? "")}" (companyName: ${companyName})`,
    };
  }

  const trackStatus = cleanEnum(raw.trackStatus, TrackStatus) ?? TrackStatus.CANDIDATE;

  return {
    ok: true,
    value: {
      companyName,
      domain: cleanDomain(raw.domain),
      segment,
      subsegment: cleanString(raw.subsegment),
      description: cleanString(raw.description),
      trackStatus,
      identificationScore: cleanScore(raw.identificationScore),
      confidence: cleanScore(raw.confidence),
      heliusFitSummary: cleanString(raw.heliusFitSummary),
      recommendedWedge: cleanString(raw.recommendedWedge),
      source: cleanString(raw.source),
      sourceUrl: cleanString(raw.sourceUrl),
    },
  };
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

/**
 * Rules for UPDATE (existing row):
 *   • `trackStatus` and `companyName` are never touched — they represent
 *     operator curation and canonical identity, respectively. Re-importing
 *     discovery data should never demote a TRACKED account back to CANDIDATE,
 *     nor rename "Jupiter" → "Jupiter Lend" when DefiLlama's tracker happens
 *     to share the same domain with a different product line.
 *   • Other fields are only overwritten when the incoming value is non-null.
 *     This means a richer existing description (e.g. from the sample seed)
 *     will not be clobbered by a sparser incoming row.
 */
function updatePayload(row: NormalizedRow): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "trackStatus" || key === "companyName") continue;
    if (value === null || value === undefined) continue;
    patch[key] = value;
  }
  return patch;
}

async function upsertRow(row: NormalizedRow): Promise<"inserted" | "updated"> {
  if (row.domain) {
    const existing = await prisma.account.findUnique({
      where: { domain: row.domain },
      select: { id: true },
    });
    await prisma.account.upsert({
      where: { domain: row.domain },
      create: row,
      update: updatePayload(row),
    });
    return existing ? "updated" : "inserted";
  }

  const match = await prisma.account.findFirst({
    where: { companyName: row.companyName, domain: null },
    select: { id: true },
  });
  if (match) {
    await prisma.account.update({ where: { id: match.id }, data: updatePayload(row) });
    return "updated";
  }
  await prisma.account.create({ data: row });
  return "inserted";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  const arg = process.argv[2];
  const path = resolve(process.cwd(), arg ?? DEFAULT_PATH);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    const message = (err as Error).message;
    console.error(`\n✗ Failed to read ${path}\n  ${message}\n`);
    await writeRunLog(prisma, {
      runType: "CANDIDATE_INGEST",
      outcome: "FAILURE",
      summary: `Failed to read ${path}`,
      durationMs: Date.now() - start,
      sourcePath: path,
      errorMessage: message,
    });
    process.exit(1);
  }

  if (!Array.isArray(raw)) {
    const message = `Expected a JSON array at the top level. Got ${typeof raw}.`;
    console.error(`\n✗ ${message}\n`);
    await writeRunLog(prisma, {
      runType: "CANDIDATE_INGEST",
      outcome: "FAILURE",
      summary: message,
      durationMs: Date.now() - start,
      sourcePath: path,
      errorMessage: message,
    });
    process.exit(1);
  }

  const entries = raw as RawRow[];
  console.log(`\n→ Importing ${entries.length} row(s) from ${path}\n`);

  let inserted = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const parsed = parseRow(entries[i]);
    if (!parsed.ok) {
      skipped.push(`[${i}] ${parsed.reason}`);
      continue;
    }
    try {
      const result = await upsertRow(parsed.value);
      if (result === "inserted") inserted++;
      else updated++;
    } catch (err) {
      skipped.push(`[${i}] ${parsed.value.companyName}: ${(err as Error).message}`);
    }
  }

  console.log(`  inserted  ${inserted}`);
  console.log(`  updated   ${updated}`);
  console.log(`  skipped   ${skipped.length}`);
  if (skipped.length > 0) {
    console.log("\n  Skipped rows:");
    for (const s of skipped) console.log(`    - ${s}`);
  }
  console.log("");

  await writeRunLog(prisma, {
    runType: "CANDIDATE_INGEST",
    outcome: skipped.length === 0 ? "SUCCESS" : "PARTIAL",
    summary: `${inserted} inserted, ${updated} updated, ${skipped.length} skipped`,
    inserted,
    updated,
    skipped: skipped.length,
    durationMs: Date.now() - start,
    sourcePath: path,
  });
}

main()
  .catch((err) => {
    console.error("\n✗ Import failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

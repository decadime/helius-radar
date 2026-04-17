/**
 * Import signals from a local JSON file.
 *
 * Account resolution: `accountId` → `domain`. Dedupe via the schema-level
 * `@@unique([accountId, title, detectedAt])` so re-imports upsert cleanly.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, SignalType } from "@prisma/client";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

const DEFAULT_PATH = "data/imports/signals.sample.json";

type RawRow = Record<string, unknown>;

type NormalizedRow = {
  accountId: string;
  signalType: SignalType;
  title: string;
  sourceUrl: string | null;
  summary: string | null;
  detectedAt: Date;
  confidence: number | null;
  impactScore: number | null;
};

type ParseResult =
  | { ok: true; value: NormalizedRow }
  | { ok: false; reason: string };

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

function cleanDate(v: unknown): Date | null {
  const s = cleanString(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveAccountId(
  raw: RawRow
): Promise<{ id: string } | { reason: string }> {
  const accountId = cleanString(raw.accountId);
  if (accountId) {
    const byId = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    return byId
      ? { id: byId.id }
      : { reason: `no account for accountId "${accountId}"` };
  }

  const domain = cleanDomain(raw.domain);
  if (domain) {
    const byDomain = await prisma.account.findUnique({
      where: { domain },
      select: { id: true },
    });
    return byDomain
      ? { id: byDomain.id }
      : { reason: `no account for domain "${domain}"` };
  }

  return { reason: "missing accountId and domain" };
}

async function parseRow(raw: RawRow): Promise<ParseResult> {
  const resolved = await resolveAccountId(raw);
  if ("reason" in resolved) return { ok: false, reason: resolved.reason };

  const title = cleanString(raw.title);
  if (!title) return { ok: false, reason: "missing title" };

  const signalType = cleanEnum(raw.signalType, SignalType);
  if (!signalType) {
    return {
      ok: false,
      reason: `invalid signalType "${String(raw.signalType ?? "")}" (title: ${title})`,
    };
  }

  const detectedAt = cleanDate(raw.detectedAt);
  if (!detectedAt) {
    return {
      ok: false,
      reason: `invalid detectedAt "${String(raw.detectedAt ?? "")}" (title: ${title})`,
    };
  }

  return {
    ok: true,
    value: {
      accountId: resolved.id,
      signalType,
      title,
      sourceUrl: cleanString(raw.sourceUrl),
      summary: cleanString(raw.summary),
      detectedAt,
      confidence: cleanScore(raw.confidence),
      impactScore: cleanScore(raw.impactScore),
    },
  };
}

async function upsertSignal(
  row: NormalizedRow
): Promise<"inserted" | "updated"> {
  // With the schema-level unique `(accountId, title, detectedAt)` we can
  // upsert atomically — no pre-check needed.
  const existing = await prisma.signal.findUnique({
    where: {
      accountId_title_detectedAt: {
        accountId: row.accountId,
        title: row.title,
        detectedAt: row.detectedAt,
      },
    },
    select: { id: true },
  });
  await prisma.signal.upsert({
    where: {
      accountId_title_detectedAt: {
        accountId: row.accountId,
        title: row.title,
        detectedAt: row.detectedAt,
      },
    },
    create: row,
    update: {
      summary: row.summary,
      sourceUrl: row.sourceUrl,
      confidence: row.confidence,
      impactScore: row.impactScore,
      signalType: row.signalType,
    },
  });
  return existing ? "updated" : "inserted";
}

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
      runType: "SIGNAL_INGEST",
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
      runType: "SIGNAL_INGEST",
      outcome: "FAILURE",
      summary: message,
      durationMs: Date.now() - start,
      sourcePath: path,
      errorMessage: message,
    });
    process.exit(1);
  }

  const entries = raw as RawRow[];
  console.log(`\n→ Importing ${entries.length} signal(s) from ${path}\n`);

  let inserted = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const parsed = await parseRow(entries[i]);
    if (!parsed.ok) {
      skipped.push(`[${i}] ${parsed.reason}`);
      continue;
    }
    try {
      const result = await upsertSignal(parsed.value);
      if (result === "inserted") inserted++;
      else updated++;
    } catch (err) {
      skipped.push(`[${i}] ${parsed.value.title}: ${(err as Error).message}`);
    }
  }

  console.log(`  inserted  ${inserted}`);
  console.log(`  updated   ${updated}`);
  console.log(`  skipped   ${skipped.length}`);
  if (skipped.length > 0) {
    console.log("\n  Skipped rows:");
    for (const s of skipped) console.log(`    ⚠  ${s}`);
  }
  console.log("");

  await writeRunLog(prisma, {
    runType: "SIGNAL_INGEST",
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

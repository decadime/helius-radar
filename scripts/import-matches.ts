/**
 * Import product matches from a local JSON file.
 *
 * Dedupe: schema-level `@@unique([accountId, heliusProduct])`.
 * Primary-match invariant: when an incoming row sets `primaryMatch: true`,
 * any other primary on that account is demoted inside the same transaction.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, HeliusProduct } from "@prisma/client";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

const DEFAULT_PATH = "data/imports/matches.sample.json";

type RawRow = Record<string, unknown>;

type NormalizedRow = {
  accountId: string;
  heliusProduct: HeliusProduct;
  matchScore: number;
  rationale: string | null;
  primaryMatch: boolean;
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

function cleanBool(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return false;
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

  const heliusProduct = cleanEnum(raw.heliusProduct, HeliusProduct);
  if (!heliusProduct) {
    return {
      ok: false,
      reason: `invalid heliusProduct "${String(raw.heliusProduct ?? "")}"`,
    };
  }

  const matchScore = cleanScore(raw.matchScore);
  if (matchScore === null) {
    return {
      ok: false,
      reason: `invalid matchScore "${String(raw.matchScore ?? "")}" (product: ${heliusProduct})`,
    };
  }

  return {
    ok: true,
    value: {
      accountId: resolved.id,
      heliusProduct,
      matchScore,
      rationale: cleanString(raw.rationale),
      primaryMatch: cleanBool(raw.primaryMatch),
    },
  };
}

async function upsertMatch(row: NormalizedRow): Promise<"inserted" | "updated"> {
  return prisma.$transaction(async (tx) => {
    if (row.primaryMatch) {
      await tx.productMatch.updateMany({
        where: {
          accountId: row.accountId,
          primaryMatch: true,
          NOT: { heliusProduct: row.heliusProduct },
        },
        data: { primaryMatch: false },
      });
    }

    const existing = await tx.productMatch.findUnique({
      where: {
        accountId_heliusProduct: {
          accountId: row.accountId,
          heliusProduct: row.heliusProduct,
        },
      },
      select: { id: true },
    });

    await tx.productMatch.upsert({
      where: {
        accountId_heliusProduct: {
          accountId: row.accountId,
          heliusProduct: row.heliusProduct,
        },
      },
      create: row,
      update: {
        matchScore: row.matchScore,
        rationale: row.rationale,
        primaryMatch: row.primaryMatch,
      },
    });

    return existing ? "updated" : "inserted";
  });
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
      runType: "MATCH_INGEST",
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
      runType: "MATCH_INGEST",
      outcome: "FAILURE",
      summary: message,
      durationMs: Date.now() - start,
      sourcePath: path,
      errorMessage: message,
    });
    process.exit(1);
  }

  const entries = raw as RawRow[];
  console.log(`\n→ Importing ${entries.length} match(es) from ${path}\n`);

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
      const result = await upsertMatch(parsed.value);
      if (result === "inserted") inserted++;
      else updated++;
    } catch (err) {
      skipped.push(`[${i}] ${parsed.value.heliusProduct}: ${(err as Error).message}`);
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
    runType: "MATCH_INGEST",
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

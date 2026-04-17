// Shared RunLog writer used by every ingest / generate script.
// A single row per invocation keeps the audit trail recoverable from the DB
// without relying on terminal scrollback.

import type { PrismaClient, RunType, RunOutcome } from "@prisma/client";

export type RunLogEntry = {
  runType: RunType;
  outcome: RunOutcome;
  summary: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
  durationMs: number;
  sourcePath?: string;
  errorMessage?: string;
};

export async function writeRunLog(prisma: PrismaClient, entry: RunLogEntry) {
  try {
    await prisma.runLog.create({
      data: {
        runType: entry.runType,
        outcome: entry.outcome,
        summary: entry.summary,
        inserted: entry.inserted ?? 0,
        updated: entry.updated ?? 0,
        skipped: entry.skipped ?? 0,
        durationMs: entry.durationMs,
        sourcePath: entry.sourcePath ?? null,
        errorMessage: entry.errorMessage ?? null,
      },
    });
  } catch (err) {
    // An audit-log failure must never mask the run it's logging. We've
    // already printed the summary to stdout; the DB write is best-effort.
    console.error("  (warning) failed to write RunLog:", (err as Error).message);
  }
}

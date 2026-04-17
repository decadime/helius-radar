// Normalization + dedupe helpers for discovery output.
//
// Discovery scripts all converge on the same `CandidateImportRow` shape,
// which is the exact JSON the `import:candidates` script expects. Keeping
// the shape here (rather than duplicating it in each script) means a schema
// tweak touches one file.

import { Segment, TrackStatus } from "../enums";

const SEGMENTS = new Set<string>(Object.values(Segment));
const STATUSES = new Set<string>(Object.values(TrackStatus));

export type CandidateImportRow = {
  companyName: string;
  domain: string | null;
  segment: string;
  subsegment: string | null;
  description: string | null;
  trackStatus: string;
  identificationScore: number | null;
  confidence: number | null;
  heliusFitSummary: string | null;
  recommendedWedge: string | null;
  source: string;
  sourceUrl: string | null;
};

export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function sanitizeSegment(input: string | null | undefined): string {
  const s = (input ?? "").trim().toUpperCase();
  return SEGMENTS.has(s) ? s : "OTHER";
}

export function sanitizeTrackStatus(input: string | null | undefined): string {
  const s = (input ?? "").trim().toUpperCase();
  return STATUSES.has(s) ? s : "CANDIDATE";
}

export function clampScore(n: number | null | undefined): number | null {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

/** Build a canonical dedupe key. Prefer domain; fall back to lowercased name. */
export function dedupeKey(row: Pick<CandidateImportRow, "domain" | "companyName">): string {
  if (row.domain) return `domain:${row.domain}`;
  return `name:${row.companyName.trim().toLowerCase()}`;
}

/** In-memory dedupe across rows. First occurrence wins. */
export function dedupeCandidates(rows: CandidateImportRow[]): CandidateImportRow[] {
  const seen = new Set<string>();
  const out: CandidateImportRow[] = [];
  for (const row of rows) {
    const key = dedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

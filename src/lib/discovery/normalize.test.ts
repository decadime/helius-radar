import { describe, expect, it } from "vitest";
import {
  clampScore,
  dedupeCandidates,
  dedupeKey,
  normalizeDomain,
  sanitizeSegment,
  sanitizeTrackStatus,
  type CandidateImportRow,
} from "./normalize";

describe("normalizeDomain", () => {
  it.each([
    ["https://Jup.Ag/", "jup.ag"],
    ["http://www.drift.trade/some/path", "drift.trade"],
    ["www.kamino.finance", "kamino.finance"],
    ["https://marginfi.com:8080", "marginfi.com"],
    ["  magiceden.io  ", "magiceden.io"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each([null, undefined, "", "   "])("falsy → null (%s)", (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});

describe("sanitizeSegment", () => {
  it("accepts known enum values case-insensitively", () => {
    expect(sanitizeSegment("dex")).toBe("DEX");
    expect(sanitizeSegment(" WALLET ")).toBe("WALLET");
  });
  it("falls back to OTHER for unknown values", () => {
    expect(sanitizeSegment("unknown-thing")).toBe("OTHER");
    expect(sanitizeSegment(null)).toBe("OTHER");
  });
});

describe("sanitizeTrackStatus", () => {
  it("accepts known values", () => {
    expect(sanitizeTrackStatus("tracked")).toBe("TRACKED");
    expect(sanitizeTrackStatus("REJECTED")).toBe("REJECTED");
  });
  it("defaults to CANDIDATE", () => {
    expect(sanitizeTrackStatus("not-a-status")).toBe("CANDIDATE");
    expect(sanitizeTrackStatus(undefined)).toBe("CANDIDATE");
  });
});

describe("clampScore", () => {
  it.each([
    [0, 0],
    [0.5, 0.5],
    [1, 1],
    [-0.4, 0],
    [1.7, 1],
  ])("%s → %s", (input, expected) => {
    expect(clampScore(input)).toBe(expected);
  });
  it("rejects non-finite", () => {
    expect(clampScore(NaN)).toBeNull();
    expect(clampScore(Infinity)).toBeNull();
    expect(clampScore(null)).toBeNull();
  });
});

describe("dedupeKey", () => {
  it("prefers domain", () => {
    expect(dedupeKey({ domain: "jup.ag", companyName: "Jupiter" })).toBe("domain:jup.ag");
  });
  it("falls back to lowercased name", () => {
    expect(dedupeKey({ domain: null, companyName: "  Jupiter  " })).toBe("name:jupiter");
  });
});

describe("dedupeCandidates", () => {
  const base: Omit<CandidateImportRow, "companyName" | "domain"> = {
    segment: "DEX",
    subsegment: null,
    description: null,
    trackStatus: "CANDIDATE",
    identificationScore: 0.8,
    confidence: 0.8,
    heliusFitSummary: null,
    recommendedWedge: null,
    source: "test",
    sourceUrl: null,
  };

  it("collapses duplicate domains to first occurrence", () => {
    const rows: CandidateImportRow[] = [
      { ...base, companyName: "Jupiter", domain: "jup.ag" },
      { ...base, companyName: "Jupiter DEX", domain: "jup.ag" },
      { ...base, companyName: "Drift Protocol", domain: "drift.trade" },
    ];
    const deduped = dedupeCandidates(rows);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].companyName).toBe("Jupiter");
  });

  it("collapses duplicate names when domain is missing", () => {
    const rows: CandidateImportRow[] = [
      { ...base, companyName: "Stealth Team", domain: null },
      { ...base, companyName: "stealth team", domain: null },
    ];
    expect(dedupeCandidates(rows)).toHaveLength(1);
  });

  it("treats different domains as separate", () => {
    const rows: CandidateImportRow[] = [
      { ...base, companyName: "Acme", domain: "a.io" },
      { ...base, companyName: "Acme", domain: "b.io" },
    ];
    expect(dedupeCandidates(rows)).toHaveLength(2);
  });

  it("preserves order of first occurrences", () => {
    const rows: CandidateImportRow[] = [
      { ...base, companyName: "Third", domain: "c.io" },
      { ...base, companyName: "First", domain: "a.io" },
      { ...base, companyName: "Second", domain: "b.io" },
      { ...base, companyName: "First again", domain: "a.io" },
    ];
    const deduped = dedupeCandidates(rows);
    expect(deduped.map((r) => r.companyName)).toEqual(["Third", "First", "Second"]);
  });
});

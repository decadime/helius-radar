import { describe, expect, it } from "vitest";
import {
  compositeScore,
  freshnessFromDays,
  matchClarity,
  buildWhyNow,
  buildNextAction,
  pickRecommendedWedge,
} from "./targetGeneration";

describe("freshnessFromDays", () => {
  it.each([
    [null, 0],
    [0, 1.0],
    [1, 0.9],
    [3, 0.9],
    [4, 0.7],
    [7, 0.7],
    [14, 0.4],
    [30, 0.2],
    [31, 0],
    [365, 0],
  ])("days=%s → %s", (days, expected) => {
    expect(freshnessFromDays(days)).toBe(expected);
  });
});

describe("matchClarity", () => {
  it("returns primary score when present", () => {
    expect(matchClarity({ matchScore: 0.9 }, { matchScore: 0.95 })).toBe(0.9);
  });
  it("penalizes non-primary top match by 0.8", () => {
    expect(matchClarity(null, { matchScore: 0.9 })).toBeCloseTo(0.72, 5);
  });
  it("returns 0 when no matches", () => {
    expect(matchClarity(null, null)).toBe(0);
  });
});

describe("compositeScore", () => {
  it("weights components 0.25 / 0.25 / 0.20 / 0.20 / 0.10 to sum to 1.0", () => {
    const score = compositeScore({ id: 1, fresh: 1, impact: 1, match: 1, rpc: 1 });
    expect(score).toBeCloseTo(1.0, 5);
  });
  it("zeros contribute zero", () => {
    expect(compositeScore({ id: 0, fresh: 0, impact: 0, match: 0, rpc: 0 })).toBe(0);
  });
  it("id alone contributes 0.25", () => {
    expect(
      compositeScore({ id: 1, fresh: 0, impact: 0, match: 0, rpc: 0 })
    ).toBeCloseTo(0.25, 5);
  });
  it("fresh alone contributes 0.25", () => {
    expect(
      compositeScore({ id: 0, fresh: 1, impact: 0, match: 0, rpc: 0 })
    ).toBeCloseTo(0.25, 5);
  });
  it("impact alone contributes 0.20", () => {
    expect(
      compositeScore({ id: 0, fresh: 0, impact: 1, match: 0, rpc: 0 })
    ).toBeCloseTo(0.2, 5);
  });
  it("match alone contributes 0.20", () => {
    expect(
      compositeScore({ id: 0, fresh: 0, impact: 0, match: 1, rpc: 0 })
    ).toBeCloseTo(0.2, 5);
  });
  it("rpc alone contributes 0.10", () => {
    expect(
      compositeScore({ id: 0, fresh: 0, impact: 0, match: 0, rpc: 1 })
    ).toBeCloseTo(0.1, 5);
  });
  it("rpc defaults to 0 when omitted — existing 4-component callers stay stable", () => {
    expect(compositeScore({ id: 1, fresh: 1, impact: 1, match: 1 })).toBeCloseTo(0.9, 5);
  });
});

describe("buildWhyNow", () => {
  it("uses segment-keyed template when a matching signal exists", () => {
    const text = buildWhyNow(
      { signalType: "FUNDING", title: "Series B" },
      0.5
    );
    expect(text).toMatch(/fresh capital/i);
    expect(text).toContain("Series B");
  });

  it("flags high-ID accounts with no signal for proactive outreach", () => {
    const text = buildWhyNow(null, 0.9);
    expect(text).toMatch(/proactive outreach/i);
  });

  it("admits low-signal state plainly for weak accounts", () => {
    const text = buildWhyNow(null, 0.3);
    expect(text).toMatch(/no recent signal/i);
  });

  it("falls back to OTHER template for unknown signal types", () => {
    const text = buildWhyNow({ signalType: "WEATHER_BALLOON", title: "x" }, 0.5);
    expect(text).toMatch(/recent movement/i);
  });
});

describe("buildNextAction", () => {
  it("maps signal type to a specific action verb", () => {
    expect(buildNextAction({ signalType: "ONCHAIN_ACTIVITY" }, null)).toMatch(
      /benchmark/i
    );
  });

  it("proposes qualifying a wedge when signal is silent but wedge is known", () => {
    expect(buildNextAction(null, "DEDICATED_NODES")).toMatch(
      /qualify fit for dedicated nodes/i
    );
  });

  it("falls back to enrich-and-confirm with nothing else to go on", () => {
    expect(buildNextAction(null, null)).toMatch(/enrich account/i);
  });
});

describe("pickRecommendedWedge", () => {
  it("prefers primary product (prettified)", () => {
    expect(pickRecommendedWedge("DAS_API", "WEBHOOKS", "Fallback")).toBe("DAS API");
  });
  it("uses top product when no primary", () => {
    expect(pickRecommendedWedge(null, "SENDER", "Fallback")).toBe("Sender");
  });
  it("uses stored account wedge when nothing else", () => {
    expect(pickRecommendedWedge(null, null, "Custom")).toBe("Custom");
  });
  it("returns null when nothing is known", () => {
    expect(pickRecommendedWedge(null, null, null)).toBeNull();
  });
});

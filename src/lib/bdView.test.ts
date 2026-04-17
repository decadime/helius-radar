import { describe, expect, it } from "vitest";
import { computeBdView, prettifyProduct } from "./bdView";

import type { BdViewInput } from "./bdView";

const baseInput: BdViewInput = {
  segment: "DEX",
  recommendedWedge: null,
  description: null,
  heliusFitSummary: null,
  signals: [],
  productMatches: [],
  todayTarget: null,
};

describe("computeBdView", () => {
  it("derives pain from segment when no signal exists", () => {
    const view = computeBdView({ ...baseInput, segment: "DEX" });
    expect(view.likelyPain).toMatch(/execution/i);
    expect(view.likelyNextMove).toMatch(/enrich/i);
  });

  it("appends a signal-type modifier when the latest signal matches", () => {
    const view = computeBdView({
      ...baseInput,
      signals: [
        {
          signalType: "FUNDING",
          title: "Series B led by Polychain",
          detectedAt: new Date(),
        },
      ],
    });
    expect(view.likelyPain).toMatch(/fresh capital|traffic scaling/i);
  });

  it("prefers primary match over top scorer for wedge", () => {
    const view = computeBdView({
      ...baseInput,
      productMatches: [
        { heliusProduct: "WEBHOOKS", matchScore: 0.95, primaryMatch: false, rationale: null },
        { heliusProduct: "DEDICATED_NODES", matchScore: 0.8, primaryMatch: true, rationale: null },
      ],
    });
    expect(view.likelyWedge).toBe("Dedicated Nodes");
  });

  it("falls back to top-scored match when no primary is set", () => {
    const view = computeBdView({
      ...baseInput,
      productMatches: [
        { heliusProduct: "WEBHOOKS", matchScore: 0.95, primaryMatch: false, rationale: null },
        { heliusProduct: "DAS_API", matchScore: 0.8, primaryMatch: false, rationale: null },
      ],
    });
    expect(view.likelyWedge).toBe("Webhooks");
  });

  it("falls back to account.recommendedWedge when no matches exist", () => {
    const view = computeBdView({
      ...baseInput,
      recommendedWedge: "Custom Wedge",
    });
    expect(view.likelyWedge).toBe("Custom Wedge");
  });

  it("reports Undetermined when no wedge info is available", () => {
    const view = computeBdView(baseInput);
    expect(view.likelyWedge).toMatch(/undetermined/i);
  });

  it("uses today's target nextAction when set", () => {
    const view = computeBdView({
      ...baseInput,
      todayTarget: {
        whyNow: null,
        nextAction: "Custom action for today",
        recommendedWedge: null,
      },
    });
    expect(view.likelyNextMove).toBe("Custom action for today");
  });

  it("falls back to latest-signal reference when no target exists", () => {
    const view = computeBdView({
      ...baseInput,
      signals: [
        {
          signalType: "HIRING",
          title: "Hired Head of Infra",
          detectedAt: new Date(),
        },
      ],
    });
    expect(view.likelyNextMove).toMatch(/hired head of infra/i);
  });

  it("truncates long signal titles in fallback next-move text", () => {
    const longTitle = "a".repeat(200);
    const view = computeBdView({
      ...baseInput,
      signals: [{ signalType: "OTHER", title: longTitle, detectedAt: new Date() }],
    });
    // Truncation adds an ellipsis when > 60 chars
    expect(view.likelyNextMove).toMatch(/…/);
  });
});

describe("prettifyProduct", () => {
  it.each([
    ["DEDICATED_NODES", "Dedicated Nodes"],
    ["SENDER", "Sender"],
    ["SHRED_DELIVERY", "Shred Delivery"],
    ["DAS_API", "DAS API"],
    ["ENHANCED_TXNS", "Enhanced Transactions"],
    ["WEBHOOKS", "Webhooks"],
    ["WALLET_API", "Wallet API"],
    ["ZK_COMPRESSION", "ZK Compression"],
  ])("%s → %s", (input, expected) => {
    expect(prettifyProduct(input)).toBe(expected);
  });

  it("passes unknown values through unchanged", () => {
    expect(prettifyProduct("UNKNOWN_PRODUCT")).toBe("UNKNOWN_PRODUCT");
  });
});

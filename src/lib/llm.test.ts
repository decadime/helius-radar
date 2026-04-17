import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runWithRetry } from "./llm";
import { EnrichedTargetSchema, buildUserPrompt } from "./enrichment";

// ─── Generic retry/parse loop ─────────────────────────────────────────────────

const TestSchema = z.object({ name: z.string(), age: z.number() });

describe("runWithRetry", () => {
  it("returns parsed+validated data on the first valid response", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('{"name":"a","age":1}');
    const result = await runWithRetry({
      fetcher,
      schema: TestSchema,
      maxAttempts: 2,
    });
    expect(result).toEqual({ name: "a", age: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries once on JSON parse failure, succeeds on the second attempt", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce('{"name":"b","age":2}');
    const result = await runWithRetry({
      fetcher,
      schema: TestSchema,
      maxAttempts: 2,
    });
    expect(result).toEqual({ name: "b", age: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns null when every attempt fails to parse", async () => {
    const fetcher = vi.fn().mockResolvedValue("not-json");
    const result = await runWithRetry({
      fetcher,
      schema: TestSchema,
      maxAttempts: 2,
    });
    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns null when the response fails schema validation after retries", async () => {
    // Valid JSON, but wrong shape — e.g. missing `age`.
    const fetcher = vi.fn().mockResolvedValue('{"name":"c"}');
    const result = await runWithRetry({
      fetcher,
      schema: TestSchema,
      maxAttempts: 2,
    });
    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns null when the fetcher throws every attempt", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network"));
    const result = await runWithRetry({
      fetcher,
      schema: TestSchema,
      maxAttempts: 2,
    });
    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops retrying once a valid response is received", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('{"name":"a","age":1}')
      .mockResolvedValueOnce("should not be called");
    await runWithRetry({ fetcher, schema: TestSchema, maxAttempts: 3 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

// ─── EnrichedTargetSchema ─────────────────────────────────────────────────────

describe("EnrichedTargetSchema", () => {
  it("accepts a well-formed object", () => {
    const result = EnrichedTargetSchema.safeParse({
      whyNow: "Shipped perps v2 yesterday; peak-load exposure live.",
      nextAction: "Offer a launch-readiness review call this week.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(
      EnrichedTargetSchema.safeParse({ whyNow: "ok enough text" }).success
    ).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(
      EnrichedTargetSchema.safeParse({ whyNow: "", nextAction: "" }).success
    ).toBe(false);
  });

  it("rejects overly long strings", () => {
    const tooLong = "a".repeat(400);
    expect(
      EnrichedTargetSchema.safeParse({
        whyNow: tooLong,
        nextAction: "ok enough",
      }).success
    ).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const result = EnrichedTargetSchema.safeParse({
      whyNow: "  cleaned up text  ",
      nextAction: "  do the thing  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.whyNow).toBe("cleaned up text");
    }
  });
});

// ─── buildUserPrompt ──────────────────────────────────────────────────────────

describe("buildUserPrompt", () => {
  it("includes all available context fields", () => {
    const prompt = buildUserPrompt({
      companyName: "Acme DEX",
      segment: "DEX",
      recommendedWedge: "Dedicated Nodes",
      latestSignal: {
        signalType: "FUNDING",
        title: "Series B led by Polychain",
        detectedAt: new Date("2026-04-15T00:00:00Z"),
        impactScore: 0.9,
      },
      primaryMatch: { heliusProduct: "DEDICATED_NODES", matchScore: 0.94 },
      rule: {
        whyNow: "Fresh capital just landed.",
        nextAction: "Intro to CTO.",
      },
    });

    expect(prompt).toContain("Acme DEX");
    expect(prompt).toContain("DEX");
    expect(prompt).toContain("Dedicated Nodes");
    expect(prompt).toContain("DEDICATED_NODES");
    expect(prompt).toContain("Series B led by Polychain");
    expect(prompt).toContain("2026-04-15");
    expect(prompt).toContain("Fresh capital just landed.");
    expect(prompt).toContain("Intro to CTO.");
    // The word "JSON" must appear so OpenAI-compatible JSON mode activates.
    expect(prompt.toLowerCase()).toContain("json");
  });

  it("handles accounts with no signal gracefully", () => {
    const prompt = buildUserPrompt({
      companyName: "Quiet Inc",
      segment: "OTHER",
      recommendedWedge: null,
      latestSignal: null,
      primaryMatch: null,
      rule: {
        whyNow: "No recent signal.",
        nextAction: "Enrich account.",
      },
    });
    expect(prompt).toContain("Latest signal: (none)");
  });
});

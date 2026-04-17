import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatScore,
  freshness,
  isoDateUTC,
  prettifyEnum,
  relativeTime,
} from "./format";

describe("isoDateUTC", () => {
  it("formats a fixed UTC date correctly", () => {
    expect(isoDateUTC(new Date("2026-04-17T00:00:00Z"))).toBe("2026-04-17");
  });
  it("is stable across timezones (UTC components)", () => {
    // Same instant, different timezone representation.
    const mid = new Date("2026-04-17T23:30:00Z");
    expect(isoDateUTC(mid)).toBe("2026-04-17");
  });
});

describe("formatScore", () => {
  it("returns dash for null/undefined", () => {
    expect(formatScore(null)).toBe("—");
    expect(formatScore(undefined)).toBe("—");
  });
  it("default places = 2", () => {
    expect(formatScore(0.123456)).toBe("0.12");
  });
  it("respects explicit places", () => {
    expect(formatScore(0.9, 3)).toBe("0.900");
  });
});

describe("formatCount", () => {
  it("uses locale grouping", () => {
    expect(formatCount(1234567)).toMatch(/1.234.567|1,234,567/);
  });
});

describe("prettifyEnum", () => {
  it("lowercases and unsnakes", () => {
    expect(prettifyEnum("MEETING_SET")).toBe("meeting set");
    expect(prettifyEnum("OPEN")).toBe("open");
  });
});

describe("freshness", () => {
  const anchor = new Date("2026-04-17T12:00:00Z");

  it("returns nulls when date is missing", () => {
    expect(freshness(null, anchor)).toEqual({ label: null, days: null });
    expect(freshness(undefined, anchor)).toEqual({ label: null, days: null });
  });

  it("today is 'today' with days=0", () => {
    const { label, days } = freshness(new Date("2026-04-17T01:00:00Z"), anchor);
    expect(days).toBe(0);
    expect(label).toBe("today");
  });

  it("1d/3d labels", () => {
    expect(freshness(new Date("2026-04-16T12:00:00Z"), anchor).label).toBe("1d ago");
    expect(freshness(new Date("2026-04-14T12:00:00Z"), anchor).label).toBe("3d ago");
  });

  it("switches to weeks past 7d", () => {
    const { label } = freshness(new Date("2026-04-03T12:00:00Z"), anchor);
    expect(label).toBe("2w ago");
  });

  it("falls back to ISO past 30d", () => {
    const { label } = freshness(new Date("2026-02-01T12:00:00Z"), anchor);
    expect(label).toBe("2026-02-01");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-04-17T12:00:00Z");
  it("seconds", () => {
    expect(relativeTime(new Date("2026-04-17T11:59:30Z"), now)).toBe("30s ago");
  });
  it("minutes", () => {
    expect(relativeTime(new Date("2026-04-17T11:55:00Z"), now)).toBe("5m ago");
  });
  it("hours", () => {
    expect(relativeTime(new Date("2026-04-17T09:00:00Z"), now)).toBe("3h ago");
  });
  it("days", () => {
    expect(relativeTime(new Date("2026-04-15T12:00:00Z"), now)).toBe("2d ago");
  });
});

// Presentation-only formatters. No business logic.
// Callers should prefer these over hand-rolled toFixed / toLocaleString calls
// so display conventions (decimal places, dash fallback, etc.) stay consistent.

import { daysSince, startOfDay } from "./date";

// ─── Dates ────────────────────────────────────────────────────────────────────

/** ISO "YYYY-MM-DD" using UTC components. Stable across server timezones. */
export function isoDateUTC(d: Date = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "3m ago", "2h ago", "5d ago". Falls back to ISO date beyond 30d. */
export function relativeTime(from: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - from.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return isoDateUTC(from);
}

/**
 * Calendar-day freshness: returns both a human label ("today", "1d ago",
 * "2w ago") and the raw day-count, so components can style by age without
 * re-parsing the label.
 */
export function freshness(date: Date | null | undefined, now: Date = new Date()) {
  if (!date) return { label: null, days: null };
  return { label: daysAgoLabel(date, now), days: daysSince(date, now) };
}

function daysAgoLabel(from: Date, now: Date): string {
  const a = startOfDay(from).getTime();
  const b = startOfDay(now).getTime();
  const days = Math.round((b - a) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return isoDateUTC(from);
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

/** 0–1 score with 2 decimal places; dash for null/undefined. */
export function formatScore(n: number | null | undefined, places = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(places);
}

/** Integer count with locale grouping. */
export function formatCount(n: number): string {
  return n.toLocaleString();
}

// ─── Enum strings ─────────────────────────────────────────────────────────────

/** "MEETING_SET" → "meeting set". */
export function prettifyEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, " ");
}

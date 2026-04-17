// Pure date math. For display formatting (ISO, relative time, "1d ago"),
// see `lib/format.ts`.

export function startOfDay(d: Date = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Parse "YYYY-MM-DD" to the instant of UTC midnight. Returns null on bad input.
 * All `targetDate` ranges use UTC boundaries so a given calendar date always
 * queries the same slice regardless of server timezone.
 */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Today as UTC midnight. */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Calendar days between `from` and `now` (0 = today, clamped at 0). */
export function daysSince(from: Date, now: Date = new Date()): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(now).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

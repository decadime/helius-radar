// Lightweight HTML fetcher with a JS-heavy heuristic.
//
// We don't use Playwright in Phase 1 — if a site is client-rendered the
// returned HTML will be mostly a shell. We detect that and surface a clear
// reason so the orchestrator can log + skip rather than sending an empty
// shell to the LLM and burning tokens on nothing.

export type FetchResult =
  | { ok: true; html: string; bytes: number }
  | { ok: false; reason: string };

const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; HeliusRadar-Discovery/0.1; +https://github.com/helius-radar)";

export async function fetchHtml(url: string): Promise<FetchResult> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status} ${res.statusText}` };
    }
    const html = await res.text();
    return { ok: true, html, bytes: html.length };
  } catch (err) {
    const name = (err as Error).name;
    if (name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: (err as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Crude "is this a client-rendered SPA?" check. Looks for:
 *  - Tiny body content (mostly `<div id="root"></div>`)
 *  - High script-to-text ratio
 *
 * Not perfect, but cheap enough to run before firing an LLM call against
 * 200KB of React bundle shell.
 */
export function looksJsHeavy(html: string): boolean {
  // Strip scripts + styles to see how much real content remains.
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  // Strip tags to get text-ish content.
  const text = withoutScripts.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // If there's very little non-script text, it's likely a JS-rendered SPA.
  return text.length < 1500;
}

/**
 * Reduce raw HTML to the roughly-readable content section. Cheap heuristics:
 * strip <head>, <script>, <style>, <svg>. Truncate to a sensible size so
 * the LLM call doesn't blow past context.
 */
export function condenseForLLM(html: string, maxChars = 80_000): string {
  const stripped = html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > maxChars
    ? stripped.slice(0, maxChars) + "…[truncated]"
    : stripped;
}

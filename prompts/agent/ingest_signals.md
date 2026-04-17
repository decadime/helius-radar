# Ingest Signals

## Purpose
Extract structured `Signal` records from raw source content (press, blog posts, X threads, job listings, on-chain activity summaries) for one or more accounts. Output is designed to drop straight into `npm run import:signals`.

## Input
```jsonc
{
  "accountRef": {                       // how to identify the subject account
    "accountId": "string | null",       // preferred if known
    "domain": "string | null"           // fallback
  },
  "asOf": "2026-04-17T00:00:00Z",       // ISO; clamp all detectedAt ≤ this
  "sources": [
    {
      "kind": "press" | "blog" | "tweet" | "job" | "onchain" | "notes",
      "url": "string | null",
      "publishedAt": "string | null",   // ISO; use if present
      "content": "string"               // the raw text to extract from
    }
  ]
}
```

## Output schema
Top-level array of Signal objects:

```jsonc
{
  "domain": "string | null",            // echo from accountRef if domain provided
  "accountId": "string | null",         // echo from accountRef if id provided
  "signalType": "SIGNAL_TYPE",
  "title": "string",                    // ≤ 100 chars, factual, no editorializing
  "summary": "string | null",           // ≤ 280 chars, 1–2 sentences
  "sourceUrl": "string | null",
  "detectedAt": "2026-04-15T14:00:00Z", // ISO, prefer source `publishedAt`, else `asOf`
  "confidence": 0.00,                   // [0, 1]
  "impactScore": 0.00                   // [0, 1]
}
```

**Allowed `signalType`:** `FUNDING | HIRING | PRODUCT_LAUNCH | ONCHAIN_ACTIVITY | TEAM_MOVE | PARTNERSHIP | TECH_CHANGE | SOCIAL | PRESS | OTHER`.

**Type selection guide**
| Content pattern | `signalType` |
|---|---|
| Raised / closed round / valuation | `FUNDING` |
| New roles posted, team ramp | `HIRING` |
| Shipped feature, mainnet launch, v2 | `PRODUCT_LAUNCH` |
| Volume, TVL, OI, tx count movements | `ONCHAIN_ACTIVITY` |
| Founder / exec hired or left | `TEAM_MOVE` |
| Integration announced with X | `PARTNERSHIP` |
| Migration / rearchitecture / stack change | `TECH_CHANGE` |
| Founder post (X, Farcaster, Warpcast) | `SOCIAL` |
| Major article / press feature | `PRESS` |
| Otherwise relevant | `OTHER` |

**Score calibration**
- `confidence`: how sure you are the event actually happened as described. First-party source → `0.9+`, secondary → `0.75`, rumor → `≤ 0.6`.
- `impactScore`: how much the event should move BD priority. A funding round with cited amount → `0.85+`; a routine partnership → `0.4–0.6`; a minor social post → `≤ 0.3`.

## Prompt

> You are extracting actionable BD signals for Helius Radar from the provided sources. Return a JSON array — no prose, no markdown fences.
>
> Rules:
> 1. One signal per discrete event. Do not merge two events into one row; do not split one event across rows.
> 2. Use the exact enum strings for `signalType`. If nothing fits, use `OTHER`.
> 3. Copy `accountId` / `domain` from `accountRef` into every emitted row so the importer can resolve.
> 4. `title` is factual and headline-length. Avoid editorializing ("important", "huge"). Prefer the event in neutral terms.
> 5. `summary` must be grounded in the source text. Do not infer amounts, dates, or parties not explicitly present.
> 6. Prefer the source's `publishedAt` for `detectedAt`. If missing, use `asOf`. Never emit a future `detectedAt`.
> 7. Calibrate `impactScore` for Helius's product wedges specifically — an event that pressures RPC/webhooks/DAS should score higher than one that doesn't.
> 8. Skip content that is not a real event (opinion pieces, generic ecosystem commentary, duplicate coverage of the same event already present).

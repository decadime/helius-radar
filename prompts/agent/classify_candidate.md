# Classify Candidate

## Purpose
Given a thin record (just a name and maybe a domain), enrich a single candidate account with segment, subsegment, description, Helius-fit narrative, and calibrated scores. The output is a patch that can be merged into the `Account` row via the candidates importer.

## Input
```jsonc
{
  "account": {
    "companyName": "string",         // required
    "domain": "string | null",
    "knownDescription": "string | null"   // scraped or analyst-provided blurb, optional
  },
  "evidence": [                       // optional array of supporting snippets
    { "kind": "homepage" | "docs" | "press" | "github" | "twitter" | "notes",
      "url": "string | null",
      "content": "string" }
  ]
}
```

## Output schema
A single object (not an array, not wrapped):

```jsonc
{
  "companyName": "string",              // echo back (or canonicalize if better form found)
  "domain": "string | null",            // normalized: lowercase, no protocol, no path
  "segment": "SEGMENT",
  "subsegment": "string | null",        // short phrase
  "description": "string",              // 1–2 factual sentences
  "trackStatus": "CANDIDATE",           // always CANDIDATE unless strong signal to promote
  "identificationScore": 0.00,          // [0, 1]
  "confidence": 0.00,                   // [0, 1]
  "heliusFitSummary": "string",         // 1 sentence on the infra pain
  "recommendedWedge": "string | null",  // display name of best-guess Helius product
  "classificationNotes": "string | null" // free-text reasoning, ≤ 240 chars
}
```

**Allowed `segment`:** `DEX | DEFI | NFT | GAMING | WALLET | INFRA | TOOLING | STABLECOIN | RWA | CONSUMER | PAYMENTS | TRADING | OTHER`.

**Allowed `trackStatus`:** `CANDIDATE | TRACKED | WATCHLIST | REJECTED`.

**Scoring rubric**
| Signal | `identificationScore` |
|---|---|
| Active on Solana, clear infra pain matches a Helius product | 0.85–0.95 |
| On Solana but unclear which wedge applies | 0.60–0.80 |
| Multi-chain with Solana as a secondary surface | 0.40–0.60 |
| No evidence of Solana usage | < 0.40 |

`confidence` reflects evidence quality, not fit strength. If evidence is only the company name, cap at `0.6`.

## Prompt

> You are enriching a single candidate account for Helius Radar. Return one JSON object matching the schema above — no prose, no markdown fences.
>
> Rules:
> 1. Use the enum strings exactly. If unsure of segment, use `OTHER` rather than guessing.
> 2. `description` must be verifiable from the evidence provided. If evidence is thin, say so in `classificationNotes` and lower `confidence`.
> 3. `heliusFitSummary` names the most likely infra pain point in one sentence, plain language, no marketing voice.
> 4. `recommendedWedge` should be the display name of a single Helius product most likely to win (e.g., "Staked RPC", "DAS API", "Webhooks"). Use `null` if unclear.
> 5. Set `trackStatus` to `CANDIDATE` unless the evidence explicitly establishes prior engagement or a clear reason to `WATCHLIST` / `REJECT`.
> 6. Never invent funding amounts, team members, or usage stats. If you infer something, mark it in `classificationNotes`.

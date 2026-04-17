# Discover Candidates

## Purpose
Expand Helius Radar's candidate universe by surfacing Solana-native companies and protocols that plausibly fit a Helius infrastructure wedge (RPC, Webhooks, DAS, LaserStream, Enhanced Transactions, etc.). The output is designed to drop straight into `npm run import:candidates`.

## Input
A JSON object describing the discovery scope plus any supporting sources.

```jsonc
{
  "scope": {
    "segments": ["DEX", "DEFI", "WALLET"],        // optional allow-list
    "stageHint": "post-seed to Series B",           // optional free text
    "region": "global",                              // optional
    "maxResults": 15                                  // target count
  },
  "exclude": {
    "domains": ["jup.ag", "drift.trade"],          // already tracked; do not repeat
    "companyNames": ["Magic Eden"]
  },
  "sources": [
    { "type": "ecosystem-map", "url": "https://solana.com/ecosystem" },
    { "type": "notes", "content": "Free-text analyst notes, optional." }
  ]
}
```

## Output schema
Top level must be an array of candidate objects (not wrapped in any envelope). Each object:

```jsonc
{
  "companyName": "string",              // required, canonical display name
  "domain": "string | null",            // lowercase, no protocol, no path
  "segment": "SEGMENT",                 // required, from allow-list below
  "subsegment": "string | null",        // short phrase, e.g. "Perp DEX"
  "description": "string",              // 1–2 sentences, factual
  "identificationScore": 0.00,          // [0, 1], see calibration below
  "confidence": 0.00,                   // [0, 1], how sure you are of the row
  "heliusFitSummary": "string",         // 1 sentence on likely infra pain
  "recommendedWedge": "string | null",  // display name of best-guess Helius product
  "source": "string",                   // short tag: "ecosystem-map" | "press" | ...
  "sourceUrl": "string | null"          // deepest supporting URL if known
}
```

**Allowed `segment` values:** `DEX | DEFI | NFT | GAMING | WALLET | INFRA | TOOLING | STABLECOIN | RWA | CONSUMER | PAYMENTS | TRADING | OTHER`.

**Score calibration**
- `identificationScore`: how strong the Helius fit is overall. `≥0.85` = clear wedge + active on Solana; `0.6–0.85` = plausible fit, needs enrichment; `<0.6` = speculative.
- `confidence`: how sure you are this row is accurate (not hallucinated). Downgrade below `0.7` when working from thin sources.

## Prompt

> You are a Solana GTM analyst populating the candidate universe for Helius Radar, a sales-intelligence tool for Helius (Solana RPC + data infrastructure).
>
> Given the scope and sources in the input, produce up to `scope.maxResults` candidate companies that plausibly fit one of Helius's product wedges. Return a JSON array conforming to the schema above — no prose, no markdown fences.
>
> Rules:
> 1. Never output a company whose domain or name appears in `exclude`.
> 2. Use the exact enum strings for `segment`. If uncertain, use `OTHER`.
> 3. Keep `description` factual and verifiable; do not invent funding or team details.
> 4. `heliusFitSummary` must be one sentence naming the likely infra pain point in plain language (e.g., "High-throughput routing likely pressures RPC reliability and txn decoding").
> 5. Calibrate `confidence` honestly. If working from weak sources, use `0.5–0.7` and rely on downstream enrichment.
> 6. Do not duplicate rows. Prefer the canonical company name over product names.
> 7. If the sources are insufficient to reach `maxResults`, return fewer rows rather than fabricating.

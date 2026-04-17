# Generate Daily Targets

## Purpose
Produce today's ranked daily target queue from tracked accounts plus their recent signals and product matches. This complements the deterministic `generate:targets` script — use this agent variant when richer `whyNow` / `nextAction` narratives are worth the LLM spend, or when you want an LLM second opinion on ranking.

## Input
```jsonc
{
  "asOf": "2026-04-17T00:00:00Z",       // UTC midnight for target date
  "topN": 10,
  "accounts": [
    {
      "accountId": "string",
      "companyName": "string",
      "segment": "SEGMENT",
      "identificationScore": 0.00,       // [0, 1] or null
      "recommendedWedge": "string | null",
      "latestSignals": [                 // 0–5, newest first
        {
          "signalType": "SIGNAL_TYPE",
          "title": "string",
          "detectedAt": "ISO",
          "impactScore": 0.00            // [0, 1] or null
        }
      ],
      "productMatches": [                // primary first, then by matchScore desc
        {
          "heliusProduct": "HELIUS_PRODUCT",
          "matchScore": 0.00,
          "primaryMatch": false
        }
      ]
    }
  ]
}
```

## Output schema
Top-level array, length ≤ `topN`, ordered best-first (position = `priorityRank` — 1).

```jsonc
{
  "accountId": "string",                // must match an input account
  "priorityRank": 1,                    // 1..N contiguous, matches array position
  "whyNow": "string",                   // ≤ 200 chars, 1–2 sentences
  "recommendedWedge": "string | null",  // prettified Helius product display name
  "nextAction": "string",               // ≤ 200 chars, imperative voice
  "status": "OPEN",                     // always OPEN on generation
  "reasoning": "string | null"          // optional ≤ 240 chars, audit trail
}
```

**Allowed `status`:** `OPEN | WORKING | CONTACTED | MEETING_SET | WON | PASSED`. On generation always emit `OPEN`.

## Ranking guidance
The deterministic baseline ([scripts/generate-targets.ts](../../scripts/generate-targets.ts)) uses:

```
score = 0.30*identificationScore + 0.30*freshness + 0.20*impactScore + 0.20*matchClarity
```

Use that as the floor. Override the pure numeric ranking only when you see a qualitative reason in the signals (e.g., a founder publicly naming an RPC pain point should beat a mechanically higher-scored account with stale signals). Note the override in `reasoning`.

## Copy rules
- **`whyNow`** names a concrete, recent event. If no recent signal, say so explicitly ("No fresh signal; high-fit account overdue for touch").
- **`nextAction`** is imperative and specific — "Intro to CTO re: RPC scaling post-raise" beats "Reach out about infrastructure."
- **`recommendedWedge`** uses the account's primary product match display name when present. Fall back to the top match, then to the account's `recommendedWedge`. Use `null` only if no wedge can be defended.

## Prompt

> You are building today's BD priority queue for Helius Radar. Return a JSON array — no prose, no markdown fences.
>
> Rules:
> 1. Length of the array ≤ `topN`. Fewer rows is fine if quality doesn't warrant padding.
> 2. Include only accounts present in the input. Never invent new accounts.
> 3. `priorityRank` must match array position (first row = 1).
> 4. Each `whyNow` must be verifiable from the provided signals — do not invent events. If no signal is strong enough to justify inclusion, drop the account.
> 5. `nextAction` must be a concrete imperative sentence a BD rep could execute today. Avoid vague "reach out" language.
> 6. Use the exact enum strings for `status`. Always emit `OPEN` on generation.
> 7. If you override the numeric baseline ranking based on qualitative judgment, populate `reasoning` with the justification in one sentence.
> 8. Prefer accounts with fresher signals and clearer primary matches. Stale high-ID accounts are fine once per week, not every day.

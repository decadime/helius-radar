# Map to Helius Product

## Purpose
Given an enriched account, score its fit against Helius's product surface and mark a single primary wedge. Output is designed to drop straight into `npm run import:matches`.

## Input
```jsonc
{
  "account": {
    "accountId": "string | null",       // preferred if known
    "domain": "string | null",
    "companyName": "string",
    "segment": "SEGMENT",
    "subsegment": "string | null",
    "description": "string",
    "heliusFitSummary": "string | null"
  },
  "recentSignals": [                    // 0–10 most recent, newest first
    { "signalType": "SIGNAL_TYPE", "title": "string", "detectedAt": "ISO" }
  ]
}
```

## Output schema
Top-level array of ProductMatch objects. Emit one row per product that earns a score > 0. Exactly one row must have `primaryMatch: true`.

```jsonc
{
  "domain": "string | null",            // echo from input
  "accountId": "string | null",         // echo from input
  "heliusProduct": "HELIUS_PRODUCT",
  "matchScore": 0.00,                   // [0, 1]
  "primaryMatch": false,                // true on exactly one row
  "rationale": "string"                 // ≤ 240 chars, one tight paragraph
}
```

**Allowed `heliusProduct` values** (must exactly match Helius's current product surface at helius.dev/docs):

| Enum | Helius product | Built for |
|---|---|---|
| `RPC` | Solana RPC Nodes | General Solana development, shared infra |
| `DEDICATED_NODES` | Dedicated Nodes | Private enterprise infra, no rate limits |
| `SENDER` | Sender | Ultra-low-latency transaction landing for traders / MEV bots |
| `SHRED_DELIVERY` | Shred Delivery | Raw shreds over UDP — earliest possible on-chain signal (HFT) |
| `LASERSTREAM` | LaserStream gRPC | Ultra-low-latency streaming of blockchain data |
| `WEBSOCKETS_ENHANCED` | Enhanced WebSockets | WSS with filtering and granular subscriptions |
| `WEBHOOKS` | Webhooks | Event notifications for on-chain activity |
| `DAS_API` | Digital Asset Standard | Most comprehensive NFT + token API on Solana |
| `ENHANCED_TXNS` | Enhanced Transactions | Decoded instructions and transfers |
| `PRIORITY_FEES` | Priority Fee API | Smart fee estimation for inclusion |
| `WALLET_API` | Wallet API | Balances, history, transfers, identities for wallet apps |
| `ZK_COMPRESSION` | ZK Compression | Compressed NFTs and tokens — drastically cheaper storage |
| `OTHER` | — | Catch-all; use sparingly |

## Product-to-pain cheat sheet
Starting point only — the real winner depends on the account's specifics.

| Account pattern | Typical primary | Secondary surfaces |
|---|---|---|
| Perp DEX, high-frequency trading, MEV bots | `SENDER` | `SHRED_DELIVERY`, `PRIORITY_FEES` |
| DEX aggregator / swap frontend at scale | `DEDICATED_NODES` | `ENHANCED_TXNS`, `PRIORITY_FEES` |
| Lending, vaults, liquidation keepers | `LASERSTREAM` | `WEBHOOKS`, `PRIORITY_FEES` |
| Stablecoin issuers, payments rails | `WEBHOOKS` | `ENHANCED_TXNS`, `WALLET_API` |
| NFT marketplace, cNFT-heavy surfaces | `DAS_API` | `ENHANCED_TXNS`, `WEBHOOKS` |
| Consumer wallets | `WALLET_API` | `ENHANCED_TXNS`, `WEBSOCKETS_ENHANCED` |
| On-chain gaming, large item economies | `DAS_API` | `ZK_COMPRESSION`, `DEDICATED_NODES` |
| Oracles, indexers, explorer-style infra | `DEDICATED_NODES` | `LASERSTREAM`, `WEBSOCKETS_ENHANCED` |
| Partnership / ecosystem-adjacent | `OTHER` | (not a product sale) |

**Important distinctions**
- Helius does **not** sell a defensive "MEV Protect" product. The MEV story is offensive — help the trader land transactions first (`SENDER`) or see mempool earliest (`SHRED_DELIVERY`). Pitching "MEV protection" is a category error.
- `RPC` (shared) is almost never the right primary for a serious buyer. It's a gateway — the paid conversion is to `DEDICATED_NODES`.
- `WALLET_API` is purpose-built for wallet / consumer-app buyers; prefer it over stitching `ENHANCED_TXNS` + raw RPC for that shape.
- `ZK_COMPRESSION` only makes sense when the account has (or will have) millions of on-chain items. Don't force-fit it.

## Scoring rubric
- `0.90+` — the product is a direct, named answer to the account's stated or obvious pain.
- `0.70–0.89` — strong plausible fit; conversation warranted.
- `0.50–0.69` — plausible secondary surface.
- `< 0.50` — weak; only include if it bridges to another conversation.

Do not emit rows scoring `0`.

## Prompt

> You are matching a Solana company to Helius's product surface for BD prioritization. Return a JSON array — no prose, no markdown fences.
>
> Rules:
> 1. Use the exact enum strings for `heliusProduct` from the table above. Never invent products. Never emit `MEV_PROTECT`, `STAKED_RPC`, or `SHIELD` — those are not products Helius sells.
> 2. Exactly one row has `primaryMatch: true`. Pick the single product you would lead outreach with. If no product exceeds `0.60`, pick the highest-scoring one anyway; downstream uses the flag to anchor the BD view.
> 3. `rationale` must name the specific pain and how the product addresses it. Avoid generic praise.
> 4. Include every product that clears `0.50`. Cap the list at 5 rows.
> 5. Let recent signals tilt scores — a funding round or product launch raises urgency for the relevant product; a social complaint about RPC flakiness should push `DEDICATED_NODES` higher.
> 6. Echo `accountId` and/or `domain` from the input on every row so the importer can resolve.
> 7. Do not claim usage or displacement unless the signals explicitly support it.

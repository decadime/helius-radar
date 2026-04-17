# Helius Radar

A prototype GTM intelligence dashboard for [Helius](https://helius.dev) — the Solana RPC + data-infrastructure company. Radar observes the Solana ecosystem, ranks tracked accounts into a daily outbound queue, and produces a defensible "why now / next action / recommended Helius wedge" for each target.

It's an **observatory**, not a CRM. Source of truth for candidates lives in the ingestion pipeline, not in form submissions.

```
                     ┌─────────────────────────────────┐
                     │  Discovery (writes JSON files)  │
                     │                                 │
                     │  • DefiLlama (Solana, TVL ≥ $1M)│
                     │  • VC portfolios (LLM-extract)  │
                     │  • Helius DAS (cNFT authorities)│
                     └──────────────┬──────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────┐
                     │  Ingestion (deterministic)      │
                     │  candidates → signals → matches │
                     │  + RunLog audit trail           │
                     └──────────────┬──────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────┐
                     │  Postgres (source of truth)     │
                     └──────────────┬──────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────┐
                     │  Target generator               │
                     │  rule-based + optional Kimi K2  │
                     │  enrichment (write-through)     │
                     └──────────────┬──────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────┐
                     │  Next.js dashboard              │
                     │  5 pages, Server Components,    │
                     │  curation actions, CSV export   │
                     └─────────────────────────────────┘
```

---

## What it does

**Discovery** — surfaces Solana-native candidates from sources where builders actually congregate:
- Live fetch of DefiLlama's Solana protocol list (7,356 protocols → ~128 candidates above $1M TVL, category-filtered to exclude CEXes / bridges / chain wrappers)
- VC portfolio scraping across 50+ crypto-native funds (Multicoin, Paradigm, Dragonfly, Polychain, Jump, etc.) with Kimi K2 doing the extraction so we don't maintain 50 bespoke HTML parsers
- Helius DAS API sampling to catch cNFT-issuing teams (gaming, consumer apps) that DefiLlama misses

**Ingestion** — three deterministic importers with shared patterns:
- Dedupe via DB-level unique constraints (domain for accounts, compound keys for signals / matches)
- Sticky-field rule on update: `trackStatus` and `companyName` are never overwritten by re-imports, so discovery never silently demotes a TRACKED account back to CANDIDATE
- One RunLog row per invocation — audit history lives in the DB, not terminal scrollback

**Intelligence** — rule-based daily target generator with optional LLM polish:
- Composite score = **0.30·idScore + 0.30·freshness + 0.20·impact + 0.20·matchClarity**
- Calendar-day freshness decay: `0d → 1.0`, `1–3d → 0.9`, `4–7d → 0.7`, `8–14d → 0.4`, `15–30d → 0.2`, `>30d → 0`
- Match clarity: primary-match score wins; non-primary top match penalized ×0.8
- Replace-all writes per day, wrapped in a transaction
- Opt-in LLM enrichment (USE_LLM=true) upgrades `whyNow` / `nextAction` via Kimi K2 through OpenRouter. Fail-soft: any LLM failure leaves the rule-based row in place. Write-through: enriched copy lands in Postgres, not recomputed per page view.

**Dashboard** — server-rendered, `force-dynamic`, dark-mode, keyboard-accessible:
- Dashboard (KPIs, today's queue, recent signals, top wedges)
- Candidate Universe (~140 accounts, segment + track-status filters)
- Tracked Accounts (search + wedge filter, freshness column tone-coded by age)
- Daily Targets (ranked queue, date navigation, CSV export, regenerate action)
- Account Detail (signal timeline, BD view card, product matches with primary highlight, curation controls)

---

## Why the product mapping matters

The `HeliusProduct` enum mirrors the real surface at [helius.dev/docs](https://helius.dev/docs):

```
RPC · DEDICATED_NODES · SENDER · SHRED_DELIVERY · LASERSTREAM ·
WEBSOCKETS_ENHANCED · WEBHOOKS · DAS_API · ENHANCED_TXNS ·
PRIORITY_FEES · WALLET_API · ZK_COMPRESSION · OTHER
```

Two decisions worth calling out:

1. **No `MEV_PROTECT`.** Helius doesn't sell defensive MEV. They sell offensive latency: `Sender` (help your traders land transactions first) and `Shred Delivery` (earliest mempool visibility). Pitching "MEV protection" to a perp DEX would be a category error. Drift's primary match in the sample data is `SENDER`, not the imaginary defensive product.

2. **Phantom's primary is `WALLET_API`, not `ENHANCED_TXNS`.** Helius literally built a product for the wallet shape. Pitching the lower-level primitive when there's a dedicated higher-level product reads as a buyer-facing mistake.

The agent prompt in [prompts/agent/map_to_helius_product.md](prompts/agent/map_to_helius_product.md) codifies both points as explicit guardrails.

---

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript** in strict mode + `noUnusedLocals` + `noUnusedParameters`
- **Tailwind CSS** with a dark-first token system; Inter + JetBrains Mono via `next/font`
- **Prisma** ORM over **Postgres 16** (native enums, unique constraints, descending indexes on hot paths)
- **OpenRouter** SDK (`openai`-compatible) for Kimi K2 inference
- **Zod** at the LLM boundary
- **Vitest** for pure-function unit tests (110 tests, 0 network, 0 mocks of the SDK)
- **GitHub Actions** CI: Postgres service → migrate → typecheck → lint → test → build
- **Docker Compose** for local Postgres

---

## Quick start

```bash
# 1. Postgres (Docker)
docker compose up -d

# 2. Install + migrate + seed
npm install
cp .env.example .env       # edit if your DATABASE_URL differs from the default
npm run db:migrate
npm run seed

# 3. Pull real Solana protocols from DefiLlama
npm run discover:defillama
npm run import:candidates -- data/imports/candidates.defillama.json
npm run generate:targets

# 4. Run the dashboard
npm run dev
```

Open <http://localhost:3000>. Dashboard shows ~140 accounts, 4 tracked, today's queue of 4 ranked targets.

### Optional: enable Kimi K2 enrichment

```bash
# In .env
USE_LLM=true
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=moonshotai/kimi-k2

# Rerun the generator — writes enriched copy into Postgres
npm run generate:targets
```

Fail-soft by design: if OpenRouter is down or rate-limits, the queue ships anyway with the rule-based copy. Persisted output means page renders never hit the LLM at request time.

### Optional: Helius on-chain discovery

```bash
# In .env
HELIUS_API_KEY=...   # free key at https://dashboard.helius.dev
```

```bash
npm run discover:helius
npm run import:candidates -- data/imports/candidates.helius.json
```

Samples compressed-NFT authorities via the DAS API. Fails with a clear setup message when the key is missing.

---

## npm scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js dev / prod build / serve |
| `typecheck` / `lint` / `test` | Verification |
| `db:migrate` / `db:reset` / `db:studio` | Prisma lifecycle |
| `seed` | Sample data end-to-end: candidates → signals → matches → targets |
| `discover:defillama` / `discover:vcs` / `discover:helius` | Discovery sources (each writes JSON) |
| `discover:all` | Run all three discovery sources in sequence |
| `import:candidates` / `import:signals` / `import:matches` | Deterministic JSON → Postgres importers |
| `generate:targets` | Daily queue generator (reads tracked accounts + signals + matches) |

---

## Architecture notes

### The JSON seam between crawling and ingestion
Discovery writes `data/imports/candidates.<source>.json`. Ingestion reads it. Neither knows the other exists. This means:
- Swap any single discovery source without touching ingestion
- Swap any single LLM provider without touching discovery
- Add a Hermes Agent-framework-driven crawler later that writes the same JSON shape — zero change required downstream

### Write-through LLM enrichment
LLM calls happen inside `generateTargetsForDate` once per day (or one "Regenerate" click). The polished `whyNow` / `nextAction` strings are persisted to `DailyTarget` rows in Postgres. Page renders and CSV exports read that same persisted column. No model call at request time, no stale / inconsistent copy, predictable cost curve (~$0.19/month at current volume on Kimi K2 via OpenRouter).

### Curation ≠ CRM
The dashboard has Promote / Watchlist / Reject on the account detail page — curation actions that let the BD operator mark their judgment. It does **not** have Add Account / Edit / Bulk Manage Coverage forms. Those would turn the dashboard into a CRM whose state drifts from the ingestion pipeline. Decided against; source of truth stays in the pipeline.

### Rule-based baseline always exists
`computeBdView()` and the deterministic `buildWhyNow` / `buildNextAction` always produce a valid row. LLM enrichment is a polish layer on top — it can fail, be disabled, or be swapped. The queue is never blocked by model availability.

---

## Testing

```bash
npm run typecheck     # strict tsc, zero warnings
npm run test          # 110 Vitest cases, pure functions only
npm run build         # next build; confirms all pages + route handlers compile
```

All three run in CI on every push to `main` via [.github/workflows/ci.yml](.github/workflows/ci.yml) with a Postgres service.

Test coverage hits the pieces that matter:
- BD view synthesizer (wedge fallback chain, pain derivation, next-move selection)
- Scoring formula (weights, freshness decay, match-clarity penalty)
- Importer validators (enum narrowing, domain normalization, score clamping)
- LLM retry loop via injected fetcher (success, parse-fail-then-success, schema drift, network error)
- CSV RFC 4180 encoding
- Dedupe rules

No mocks of the OpenAI SDK — the retry/validate core is a pure function accepting a `fetcher` callback, so tests stay deterministic and fast.

---

## Deployment

Vercel + Neon is the smooth path for Next.js + Postgres:

1. Push `main` to GitHub
2. Create a Neon Postgres project; copy the pooled and direct connection strings
3. Import the repo into Vercel; set `DATABASE_URL`, `DIRECT_URL`, optionally `USE_LLM` + `OPENROUTER_API_KEY`
4. Override Vercel's Build Command to `prisma migrate deploy && next build`
5. Deploy; run `npm run seed` + `discover:defillama` locally against the prod DATABASE_URL to populate data

Railway, Fly.io, and Render also work; Docker image is straightforward if you want full control.

---

## What's deliberately out of scope (Phase 2)

| Area | Current state | Phase 2 |
|---|---|---|
| Signal ingestion from live sources | Sample JSON only | RSS watchers, careers page diff, X handle polling, on-chain deltas |
| Scheduled jobs | None | Vercel Cron for `discover:*` + `generate:targets` on timers |
| Helius-native program discovery | cNFT-authority sampling | Proper indexer (Dune/Flipside/custom) for new program deployments by activity |
| VC scraper for JS-heavy SPAs | ~15 VCs skipped with a log line | Playwright fallback, opt-in per-source |
| KPI deltas on dashboard | StatCard `delta` prop exists but unused | `DailyCountSnapshot` model + piggyback capture inside `generate:targets` |
| Authentication | None — internal tool | Clerk / Auth.js when the tool leaves prototype scope |

None of these block the dashboard from being useful today.

---

## Project layout

```
prisma/               # schema + migrations
data/imports/         # sample JSON + live discovery output (gitignored outputs)
scripts/              # CLI: import-*, discover-*, generate-targets
scripts/_lib/         # shared script helpers (RunLog writer)
prompts/agent/        # agent contracts — JSON schemas matching the importers
src/
  app/                # Next.js 14 App Router pages + API routes
  components/
    shell/            # Sidebar, TopBar, responsive drawer context
    ui/               # Panel, DataTable, Badges, Button, StatCard, StatusPill
    dashboard/        # SignalList, WedgeBar
    universe/         # UniverseFilters, UniverseTable
    tracked/          # TrackedFilters, TrackedTable
    targets/          # DateSelector, TargetsSummary, TargetsTable, RegenerateButton
    account/          # BdViewCard, ProductMatchList, SignalTimeline, TrackStatusControls
  lib/
    enums.ts          # re-exports Prisma-generated enums (single source of truth)
    queries.ts        # shared Prisma read queries
    bdView.ts         # rule-based BD view synthesizer
    targetGeneration.ts  # scoring formula + target generator
    llm.ts            # OpenRouter client + testable retry/validate core
    enrichment.ts     # target enrichment prompt + zod schema
    csv.ts            # RFC 4180 encoder
    discovery/        # fetch, extract, normalize, vc-list
    date.ts           # pure date math
    format.ts         # display formatters
.github/workflows/    # CI pipeline
docker-compose.yml    # local Postgres
```

---

## License

MIT. See [LICENSE](LICENSE).

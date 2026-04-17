# Helius Radar

A prototype GTM intelligence dashboard for [Helius](https://helius.dev) — the Solana RPC + data-infrastructure company. Radar observes the Solana ecosystem, **fingerprints which RPC provider every app runs on**, and ranks competitor-RPC accounts into a daily displacement queue with LLM-written pitch copy.

It's an **observatory**, not a CRM. Source of truth for candidates lives in the ingestion pipeline, not in form submissions.

```
                     ┌─────────────────────────────────┐
                     │  Discovery (writes JSON files)  │
                     │                                 │
                     │  • DefiLlama (Solana, TVL ≥ $1M)│
                     │  • VC portfolios (LLM-extract)  │
                     │  • Helius DAS (cNFT authorities)│
                     │  • RPC fingerprinting (bundles) │
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
                     │  rule-based + optional LLM      │
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

**Discovery** — four converging sources, all landing on the same JSON seam:

- **DefiLlama** — live fetch of the Solana protocol list, filtered to TVL threshold, category-excluded (CEXes / bridges / chain wrappers) so the output is real builders and not exchanges that custody Solana
- **VC portfolios** — one generic extractor across 50+ crypto-native funds (Multicoin, Paradigm, Dragonfly, Polychain, Electric, Framework, Variant, a16z crypto, …) with an LLM reading the HTML; no per-site parsers to maintain
- **Helius DAS API** — samples cNFT-issuing authorities for gaming / consumer apps that DefiLlama misses
- **RPC fingerprinting** — scans app frontend bundles against a table of known RPC-provider URL patterns; surfaces accounts on Alchemy, QuickNode, Triton, Syndica, Shyft, Ankr, Chainstack, or the public Solana endpoint as explicit displacement targets

**Ingestion** — three deterministic importers with shared patterns:

- Dedupe via DB-level unique constraints (domain for accounts, compound keys for signals + matches)
- Sticky-field rule on update: `trackStatus` and `companyName` are never overwritten by re-imports, so re-discovery never silently demotes a TRACKED account back to CANDIDATE
- One `RunLog` row per invocation — audit history lives in the DB, not terminal scrollback

**Intelligence** — rule-based daily target generator with optional LLM polish:

- Composite score = **`0.25·id + 0.25·fresh + 0.20·impact + 0.20·match + 0.10·rpc`** (all components in `[0, 1]`, weights sum to `1.0`)
- `rpc` component rewards accounts observably on a competitor RPC: `1.0` competitor, `0.3` unknown, `0.2` proxied, `0.0` already on Helius
- Calendar-day freshness decay: `0d → 1.0`, `1–3d → 0.9`, `4–7d → 0.7`, `8–14d → 0.4`, `15–30d → 0.2`, `>30d → 0`
- Match clarity: primary `ProductMatch` score wins; non-primary top match penalized ×0.8
- Replace-all writes per day, wrapped in a transaction — idempotent by construction
- Opt-in LLM enrichment (`USE_LLM=true`) upgrades `whyNow` + `nextAction` via OpenRouter (Hermes 4 or Kimi K2 — configurable). Write-through to Postgres; fail-soft fallback to rule-based copy on any LLM failure

**Dashboard** — server-rendered, `force-dynamic`, dark-mode, keyboard-accessible, responsive down to 375 px:

- **Dashboard** — KPIs including **Displacement Pipeline** (count of accounts on competitor RPCs), today's BD priorities with an RPC column, recent signals feed, **Competitor RPC landscape** panel with proportional bars per competitor, top wedges
- **Candidate Universe** — segment + track-status filters, "On competitor RPC" filter chip, row-click navigation
- **Tracked Accounts** — debounced case-insensitive search, wedge filter, freshness column tone-coded by age, RPC column
- **Daily Targets** — ranked queue, date navigation, CSV export, **rate-limited Regenerate button** (3 UI runs per UTC day)
- **Account Detail** — signal timeline (including `TECH_CHANGE` events emitted by RPC detection), BD view card that leads with `"Currently on <Competitor> — direct displacement candidate"` when applicable, product matches with primary highlight, Track / Watchlist / Reject curation controls

---

## The RPC detection play

Helius's direct competitors are **Alchemy, QuickNode, Triton, Syndica, Shyft, Ankr, and Chainstack**. Every Solana dapp frontend calls one of them over HTTP, and the URL is baked into the JS bundle shipped to every browser. The bundle is public.

`npm run detect:rpc` fetches each account's homepage + linked scripts, regex-matches against a maintained provider-pattern table ([src/lib/rpc-providers.ts](src/lib/rpc-providers.ts)), and persists the result on `Account.rpcProvider` with `rpcDetectedAt`. On first detection of a competitor (or when the provider changes), it emits a `TECH_CHANGE` `Signal` so the event appears in the Recent Signals feed and the account's timeline.

| Detected value | Meaning |
|---|---|
| `HELIUS` | Existing customer — deprioritized in scoring |
| `ALCHEMY` / `QUICKNODE` / `TRITON` / `SYNDICA` / `SHYFT` / `ANKR` / `CHAINSTACK` / `PUBLIC_SOLANA` | Direct displacement target |
| `PROXIED` | Own-domain proxy hides the underlying provider |
| `UNKNOWN` | Bundle scanned, no pattern matched (server-side only, or dynamic config) |

The feature is surfaced in four places in the UI: the **Displacement Pipeline** KPI, the **Competitor RPC landscape** panel on the Dashboard, an **RPC column** in every list table, and the **BD view card** on Account Detail that leads the pain narrative with the competitor name when applicable.

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
- **Tailwind CSS** with Helius brand tokens (orange-red accent, warm-dark background ladder, Inter + JetBrains Mono via `next/font`)
- **Prisma** ORM over **Postgres 16** (native enums, unique constraints, descending indexes on hot paths)
- **OpenRouter** SDK (`openai`-compatible) — use any model via `OPENROUTER_MODEL`; tested with `nousresearch/hermes-4-405b` and `moonshotai/kimi-k2`
- **Zod** at the LLM boundary for response-shape validation
- **Vitest** — 139 unit tests, pure functions only, zero network, zero SDK mocks
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

# 3. Pull live Solana protocols + fingerprint their RPCs
npm run discover:defillama
npm run import:candidates -- data/imports/candidates.defillama.json
npm run detect:rpc -- --limit=30

# 4. Generate today's ranked queue
npm run generate:targets

# 5. Run the dashboard
npm run dev
```

### Optional: LLM enrichment via OpenRouter

```bash
# In .env
USE_LLM=true
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nousresearch/hermes-4-405b   # or moonshotai/kimi-k2, anthropic/claude-…, etc.

# Rerun the generator — writes enriched copy into Postgres
npm run generate:targets
```

Fail-soft by design: if OpenRouter is down, rate-limits, or returns a schema-drift response, the queue ships anyway with the rule-based copy. Persisted output means page renders never hit the LLM at request time.

The Regenerate button on the Daily Targets page is rate-limited to **3 UI triggers per UTC day** (via RunLog counting) so button-spam can't burn through OpenRouter credits. The CLI has no limit.

### Optional: Helius on-chain discovery + RPC detection

```bash
# In .env
HELIUS_API_KEY=...   # free key at https://dashboard.helius.dev
```

```bash
npm run discover:helius   # samples cNFT authorities via DAS
npm run detect:rpc        # fingerprints frontend bundles
```

Both scripts fail with a clear setup message when the relevant key is missing.

---

## npm scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js dev / prod build / serve |
| `typecheck` / `lint` / `test` / `test:watch` | Verification |
| `db:migrate` / `db:reset` / `db:generate` / `db:studio` | Prisma lifecycle |
| `seed` | Sample data end-to-end: candidates → signals → matches → targets |
| `discover:defillama` / `discover:vcs` / `discover:helius` | Discovery sources (each writes JSON) |
| `discover:all` | Run all three discovery sources in sequence |
| `detect:rpc` | Fingerprint each account's RPC provider from its frontend bundle |
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
LLM calls happen inside `generateTargetsForDate` once per day (or one "Regenerate" click). The polished `whyNow` + `nextAction` strings are persisted to `DailyTarget` rows in Postgres. Page renders and CSV exports read that same persisted column. No model call at request time, no stale or inconsistent copy, predictable cost curve (~$0.20/month at current volume on OpenRouter).

### Curation ≠ CRM
The dashboard has Promote / Watchlist / Reject on the account detail page — curation actions that let the BD operator mark their judgment. It does **not** have Add Account / Edit / Bulk Manage Coverage forms. Those would turn the dashboard into a CRM whose state drifts from the ingestion pipeline. Decided against; source of truth stays in the pipeline.

### Rule-based baseline always exists
`computeBdView()` and the deterministic `buildWhyNow` / `buildNextAction` always produce a valid row. LLM enrichment is a polish layer on top — it can fail, be disabled, or be swapped. The queue is never blocked by model availability.

### Rate limit
UI-triggered `generate:targets` runs are capped at `MAX_UI_REGENERATIONS_PER_DAY` (default `3`) per UTC day, enforced server-side inside the `regenerateTodaysTargets` action by counting `RunLog` rows tagged `(via UI)`. The button label reflects the remaining count; the CLI is unaffected.

---

## Testing

```bash
npm run typecheck     # strict tsc, zero warnings
npm run test          # 139 Vitest cases, pure functions only
npm run build         # next build; confirms all pages + route handlers compile
```

All three run in CI on every push to `main` via [.github/workflows/ci.yml](.github/workflows/ci.yml) with a Postgres service.

Test coverage hits the pieces that matter:

- BD view synthesizer (wedge fallback chain, pain derivation, next-move selection, competitor-RPC lead prefix)
- Scoring formula (individual component weights, freshness decay, match-clarity penalty)
- RPC provider detection (URL-pattern matching, competitor-wins-over-stale-Helius, displacement-score mapping)
- Importer validators (enum narrowing, domain normalization, score clamping)
- Discovery normalizers and VC-list invariants
- LLM retry loop via injected fetcher (success, parse-fail-then-success, schema drift, network error)
- CSV RFC 4180 encoding
- Dedupe rules

No mocks of the OpenAI SDK — the retry/validate core is a pure function accepting a `fetcher` callback, so tests stay deterministic and fast.

---

## Deployment

Vercel + Neon is the smooth path for Next.js + Postgres:

1. Push `main` to GitHub
2. Create a Neon Postgres project; copy the **pooled** and **direct** connection strings
3. Import the repo into Vercel; set:
   - `DATABASE_URL` (Neon pooled)
   - `DIRECT_URL` (Neon direct — used by `prisma migrate`)
   - `USE_LLM=true` + `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` (optional but recommended)
   - `HELIUS_API_KEY` (optional, required only for `detect:rpc` and `discover:helius`)
4. Override Vercel's Build Command to `prisma migrate deploy && next build`
5. Deploy; from your laptop, `export DATABASE_URL=<Neon pooled>` then run `npm run seed` + `discover:defillama` + `detect:rpc` + `generate:targets` to populate data

Railway, Fly.io, and Render also work; Docker image is straightforward if you want full control.

---

## What's deliberately out of scope (Phase 2)

| Area | Current state | Phase 2 |
|---|---|---|
| Signal ingestion from live sources | Sample JSON + RPC-detection TECH_CHANGE | RSS watchers, careers-page diff, X-handle polling, on-chain deltas |
| Scheduled jobs | None | Vercel Cron for `discover:*` + `detect:rpc` + `generate:targets` on timers |
| Helius-native program discovery | cNFT-authority sampling (narrow) | Proper indexer (Dune / Flipside / custom) for new program deployments ranked by activity |
| VC scraper for JS-heavy SPAs | ~15 VCs skipped with a log line | Playwright fallback, opt-in per-source |
| RPC detection for proxied apps | Classified `PROXIED`, provider opaque | Traffic-inspection side-channel or partner data |
| KPI deltas on dashboard | `StatCard.delta` prop exists but unused | `DailyCountSnapshot` model + piggyback capture inside `generate:targets` |
| Authentication | None — internal tool | Clerk / Auth.js when the tool leaves prototype scope |

None of these block the dashboard from being useful today.

---

## Project layout

```
prisma/                         # schema + migrations
data/imports/                   # sample JSON + gitignored discovery outputs
scripts/
  import-*.ts                   # candidate / signal / match importers
  discover-*.ts                 # DefiLlama / VC portfolios / Helius DAS
  detect-rpc-providers.ts       # competitor-RPC fingerprinting
  generate-targets.ts           # daily queue generator
  _lib/run-log.ts               # shared RunLog writer
prompts/agent/                  # agent contracts — JSON schemas matching the importers
src/
  app/
    layout.tsx                  # shell with sidebar + topbar + responsive drawer
    page.tsx                    # Dashboard
    universe/                   # Candidate Universe
    tracked/                    # Tracked Accounts
    targets/                    # Daily Targets + Regenerate server action
    accounts/[id]/              # Account Detail + track-status server action
    api/*/export/               # CSV route handlers (targets / universe / tracked)
  components/
    shell/                      # Sidebar, TopBar, ShellContext (responsive drawer)
    ui/                         # Panel, DataTable, Badges, Button, StatCard, StatusPill
    dashboard/                  # SignalList, WedgeBar, CompetitorRpcBars
    universe/                   # UniverseFilters, UniverseTable
    tracked/                    # TrackedFilters, TrackedTable
    targets/                    # DateSelector, TargetsSummary, TargetsTable, RegenerateButton
    account/                    # BdViewCard, ProductMatchList, SignalTimeline, TrackStatusControls
  lib/
    enums.ts                    # re-exports Prisma-generated enums (single source of truth)
    queries.ts                  # shared Prisma read queries
    bdView.ts                   # rule-based BD view synthesizer
    targetGeneration.ts         # scoring formula + target generator
    rpc-providers.ts            # provider patterns, display names, displacement scores
    llm.ts                      # OpenRouter client + testable retry/validate core
    enrichment.ts               # target enrichment prompt + zod schema
    csv.ts                      # RFC 4180 encoder
    rateLimits.ts               # UI rate-limit constants
    discovery/                  # fetch, extract, normalize, vc-list
    date.ts                     # pure date math
    format.ts                   # display formatters
.github/workflows/ci.yml        # CI pipeline
docker-compose.yml              # local Postgres
```

---

## License

MIT. See [LICENSE](LICENSE).

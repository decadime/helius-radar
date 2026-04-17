/**
 * RPC-provider detection for the candidate universe.
 *
 * For each account with a domain, fetches the homepage and its linked
 * JS bundles, then regex-matches against the known RPC-provider URL
 * patterns. The detected provider is persisted on `Account.rpcProvider`
 * along with `rpcDetectedAt`.
 *
 * Detectable signals:
 *   - Helius (existing customer; not a BD displacement target)
 *   - Alchemy / QuickNode / Syndica / Triton / Shyft / Ankr / Chainstack
 *     (explicit displacement targets)
 *   - Public Solana endpoint (api.mainnet-beta.solana.com — even sharper
 *     BD story: "they haven't upgraded to a paid RPC yet")
 *   - Proxied (the account routes via its own domain)
 *   - Unknown (server-side only or dynamic config)
 *
 * Usage:
 *   npm run detect:rpc                        # scan every account with a domain
 *   npm run detect:rpc -- --limit=20          # top 20 by identification score
 *   npm run detect:rpc -- --only=jup.ag       # one domain, verbose
 */

import { PrismaClient, RpcProvider } from "@prisma/client";
import {
  detectProviderInBundle,
  providerDisplay,
} from "../src/lib/rpc-providers";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

const FETCH_TIMEOUT_MS = 15_000;
const BUNDLE_MAX_BYTES = 2_000_000; // 2 MB cap per bundle
const BUNDLE_PARALLEL = 4;
const DOMAIN_PARALLEL = 4;

type Args = { limit: number | null; only: string | null; verbose: boolean };

function parseArgs(argv: string[]): Args {
  let limit: number | null = null;
  let only: string | null = null;
  let verbose = false;
  for (const a of argv.slice(2)) {
    if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a.startsWith("--only=")) {
      only = a.slice("--only=".length).trim() || null;
    } else if (a === "--verbose" || a === "-v") {
      verbose = true;
    }
  }
  return { limit, only, verbose };
}

async function fetchText(url: string, maxBytes = BUNDLE_MAX_BYTES): Promise<string | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HeliusRadar-RPCDetect/0.1; +https://github.com/decadime/helius-radar)",
        Accept: "*/*",
      },
    });
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return await res.text();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let received = 0;
    let out = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (received > maxBytes) {
        await reader.cancel();
        break;
      }
    }
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract script src URLs + inline script content from homepage HTML. */
function extractScriptSources(
  html: string,
  baseUrl: string
): { urls: string[]; inline: string } {
  const urls: string[] = [];
  const inlineParts: string[] = [];

  // <script src="..."> (self-closing or empty-bodied)
  const srcRe = /<script[^>]+src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = srcRe.exec(html)) !== null) {
    urls.push(m[1]);
  }

  // <link rel="modulepreload" href="..."> — Vite / modern bundlers
  const preloadRe = /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["']/gi;
  while ((m = preloadRe.exec(html)) !== null) {
    urls.push(m[1]);
  }

  // <script type="module" src="...">
  const moduleRe =
    /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/gi;
  while ((m = moduleRe.exec(html)) !== null) {
    urls.push(m[1]);
  }

  // Inline <script>…</script> (with content, not self-closing with src)
  const inlineRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = inlineRe.exec(html)) !== null) {
    if (m[1] && m[1].length > 0) inlineParts.push(m[1]);
  }

  // Resolve relative URLs against the page's origin.
  const resolved = urls.map((u) => {
    try {
      return new URL(u, baseUrl).toString();
    } catch {
      return null;
    }
  });

  return {
    urls: Array.from(new Set(resolved.filter((u): u is string => !!u))),
    inline: inlineParts.join("\n"),
  };
}

/** Fetch bundles in bounded parallelism, concatenate results. */
async function fetchBundles(urls: string[]): Promise<string> {
  const chunks: string[] = [];
  for (let i = 0; i < urls.length; i += BUNDLE_PARALLEL) {
    const slice = urls.slice(i, i + BUNDLE_PARALLEL);
    const results = await Promise.all(slice.map((u) => fetchText(u)));
    for (const r of results) if (r) chunks.push(r);
  }
  return chunks.join("\n");
}

/**
 * If we see the account's own domain referenced as an RPC endpoint
 * (e.g. `https://drift.trade/api/rpc` or `rpc.drift.trade`), classify
 * as PROXIED — the underlying provider is hidden behind their own domain.
 */
function looksProxied(combined: string, ownDomain: string): boolean {
  // Escape domain for use inside a regex.
  const esc = ownDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const proxyPatterns = [
    new RegExp(`https?://(?:[\\w-]+\\.)?${esc}/[\\w/-]*rpc`, "i"),
    new RegExp(`https?://rpc\\.${esc}`, "i"),
    new RegExp(`https?://api\\.${esc}/[\\w/-]*rpc`, "i"),
  ];
  return proxyPatterns.some((p) => p.test(combined));
}

type DetectionResult = {
  accountId: string;
  companyName: string;
  domain: string;
  provider: RpcProvider;
  sourceCount: number;
  error?: string;
};

async function detectOne(account: {
  id: string;
  companyName: string;
  domain: string;
}): Promise<DetectionResult> {
  const origin = `https://${account.domain}`;
  const html = await fetchText(origin, 1_000_000);
  if (!html) {
    return {
      accountId: account.id,
      companyName: account.companyName,
      domain: account.domain,
      provider: RpcProvider.UNKNOWN,
      sourceCount: 0,
      error: "homepage fetch failed",
    };
  }

  const { urls, inline } = extractScriptSources(html, origin);
  const bundleBlob = await fetchBundles(urls);
  const combined = [html, inline, bundleBlob].join("\n");

  // Detection order: competitor > helius > proxied > unknown.
  const detected = detectProviderInBundle(combined);
  let provider: RpcProvider;
  if (detected) {
    provider = detected;
  } else if (looksProxied(combined, account.domain)) {
    provider = RpcProvider.PROXIED;
  } else {
    provider = RpcProvider.UNKNOWN;
  }

  return {
    accountId: account.id,
    companyName: account.companyName,
    domain: account.domain,
    provider,
    sourceCount: urls.length + (inline.length > 0 ? 1 : 0),
  };
}

/** Run detections with bounded per-domain concurrency. */
async function detectAll(
  accounts: Array<{ id: string; companyName: string; domain: string }>,
  verbose: boolean
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  for (let i = 0; i < accounts.length; i += DOMAIN_PARALLEL) {
    const slice = accounts.slice(i, i + DOMAIN_PARALLEL);
    const r = await Promise.all(slice.map(detectOne));
    for (const res of r) {
      results.push(res);
      const provider = providerDisplay(res.provider);
      const tag =
        res.provider === RpcProvider.HELIUS
          ? "✓"
          : res.provider === RpcProvider.UNKNOWN
            ? "·"
            : res.provider === RpcProvider.PROXIED
              ? "~"
              : "!";
      const suffix = res.error ? `  (${res.error})` : "";
      console.log(
        `  ${tag} ${res.companyName.padEnd(28, " ")}${res.domain.padEnd(28, " ")}${provider}${suffix}`
      );
      if (verbose && res.error) console.log(`    → ${res.error}`);
    }
  }
  return results;
}

async function main() {
  const start = Date.now();
  const args = parseArgs(process.argv);

  const where: { domain: { not: null } | string } | Record<string, unknown> = args.only
    ? { domain: args.only }
    : { domain: { not: null } };

  const accounts = await prisma.account.findMany({
    where,
    orderBy: [
      { identificationScore: { sort: "desc", nulls: "last" } },
      { companyName: "asc" },
    ],
    take: args.limit ?? undefined,
    select: { id: true, companyName: true, domain: true },
  });

  const scannable = accounts.filter(
    (a): a is { id: string; companyName: string; domain: string } =>
      typeof a.domain === "string" && a.domain.length > 0
  );

  console.log(`\n→ Scanning ${scannable.length} account(s) for RPC provider\n`);

  if (scannable.length === 0) {
    console.log("  Nothing to scan.\n");
    await prisma.$disconnect();
    return;
  }

  const results = await detectAll(scannable, args.verbose);

  // Persist detections
  const scannedAt = new Date();
  for (const r of results) {
    await prisma.account.update({
      where: { id: r.accountId },
      data: { rpcProvider: r.provider, rpcDetectedAt: scannedAt },
    });
  }

  // Summary counts
  const counts = new Map<RpcProvider, number>();
  for (const r of results) {
    counts.set(r.provider, (counts.get(r.provider) ?? 0) + 1);
  }

  console.log(`\n  Distribution:`);
  for (const [provider, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${providerDisplay(provider).padEnd(24, " ")} ${count}`);
  }

  const competitors = results.filter(
    (r) =>
      r.provider !== RpcProvider.HELIUS &&
      r.provider !== RpcProvider.UNKNOWN &&
      r.provider !== RpcProvider.PROXIED
  );
  console.log(`\n  Displacement targets:        ${competitors.length}`);
  console.log(`  Already on Helius:           ${counts.get(RpcProvider.HELIUS) ?? 0}`);
  console.log(`  Proxied (provider hidden):   ${counts.get(RpcProvider.PROXIED) ?? 0}`);
  console.log(`  Unknown (server-side/other): ${counts.get(RpcProvider.UNKNOWN) ?? 0}\n`);

  await writeRunLog(prisma, {
    runType: "CANDIDATE_DISCOVERY",
    outcome: "SUCCESS",
    summary:
      `RPC scan: ${results.length} accounts, ` +
      `${competitors.length} displacement targets, ` +
      `${counts.get(RpcProvider.HELIUS) ?? 0} on Helius`,
    updated: results.length,
    durationMs: Date.now() - start,
  });
}

main()
  .catch(async (err) => {
    console.error("\n✗ RPC detection failed:", err);
    await writeRunLog(prisma, {
      runType: "CANDIDATE_DISCOVERY",
      outcome: "FAILURE",
      summary: "RPC detection failed",
      durationMs: 0,
      errorMessage: (err as Error).message,
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

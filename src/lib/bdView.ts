// Pure, deterministic BD view derived from stored data.
// Designed to be swappable with an AI-backed summarizer later.

export type BdViewInput = {
  segment: string;
  recommendedWedge: string | null;
  description: string | null;
  heliusFitSummary: string | null;
  signals: Array<{
    signalType: string;
    title: string;
    detectedAt: Date;
  }>;
  productMatches: Array<{
    heliusProduct: string;
    matchScore: number;
    primaryMatch: boolean;
    rationale: string | null;
  }>;
  todayTarget: {
    whyNow: string | null;
    nextAction: string | null;
    recommendedWedge: string | null;
  } | null;
};

export type BdView = {
  likelyPain: string;
  likelyWedge: string;
  likelyNextMove: string;
};

// Segment → canonical infra pain profile on Solana.
const SEGMENT_PAIN: Record<string, string> = {
  DEX: "Low-latency execution and reliable mempool visibility under burst load.",
  TRADING: "Execution determinism and MEV exposure on high-frequency paths.",
  DEFI: "RPC reliability under load and complex historical indexing.",
  NFT: "Compressed NFT scale and DAS-style read performance.",
  GAMING: "High-throughput transaction flow and predictable confirmation.",
  WALLET: "Clean transaction parsing, balance enrichment, and webhooks.",
  CONSUMER: "Mainstream UX resilience and graceful degradation at scale.",
  INFRA: "Dependable node primitives and observability.",
  TOOLING: "Reliable data surfaces for developer-facing products.",
  STABLECOIN: "Settlement reliability and compliance-grade observability.",
  PAYMENTS: "Settlement latency and per-txn cost control.",
  RWA: "Auditable transaction history and compliance tooling.",
  OTHER: "Scalable Solana infrastructure without operational overhead.",
};

const SIGNAL_HINT: Partial<Record<string, string>> = {
  FUNDING: "fresh capital → expect traffic scaling and a new infra review.",
  HIRING: "team ramping → infra decisions are likely open.",
  PRODUCT_LAUNCH: "launch window → peak-load exposure is imminent.",
  ONCHAIN_ACTIVITY: "on-chain volume is trending up → RPC load pressure.",
  PARTNERSHIP: "integration breadth is widening → SDK and webhook surface matters.",
  TECH_CHANGE: "stack is moving → displacement window is open.",
};

export function computeBdView(input: BdViewInput): BdView {
  const basePain =
    SEGMENT_PAIN[input.segment] ?? SEGMENT_PAIN.OTHER;

  const latest = input.signals[0];
  const hint = latest ? SIGNAL_HINT[latest.signalType] : undefined;
  const likelyPain = hint ? `${basePain} ${capitalize(hint)}` : basePain;

  const primary = input.productMatches.find((m) => m.primaryMatch);
  const topByScore = [...input.productMatches].sort(
    (a, b) => b.matchScore - a.matchScore
  )[0];

  const wedgeFromMatch = primary ?? topByScore;
  const likelyWedge =
    (wedgeFromMatch && prettifyProduct(wedgeFromMatch.heliusProduct)) ??
    input.todayTarget?.recommendedWedge ??
    input.recommendedWedge ??
    "Undetermined — needs enrichment.";

  let likelyNextMove: string;
  if (input.todayTarget?.nextAction) {
    likelyNextMove = input.todayTarget.nextAction;
  } else if (latest) {
    likelyNextMove = `Reach out referencing "${truncate(latest.title, 60)}".`;
  } else if (input.recommendedWedge) {
    likelyNextMove = `Qualify fit for ${input.recommendedWedge} with an infra-owner intro.`;
  } else {
    likelyNextMove = "Enrich account profile, then confirm the wedge hypothesis.";
  }

  return { likelyPain, likelyWedge, likelyNextMove };
}

// Display names sourced from helius.dev/docs. Keep in sync with the
// HeliusProduct enum in prisma/schema.prisma.
export function prettifyProduct(p: string): string {
  const map: Record<string, string> = {
    RPC: "Solana RPC",
    DEDICATED_NODES: "Dedicated Nodes",
    SENDER: "Sender",
    SHRED_DELIVERY: "Shred Delivery",
    LASERSTREAM: "LaserStream",
    WEBSOCKETS_ENHANCED: "Enhanced WebSockets",
    WEBHOOKS: "Webhooks",
    DAS_API: "DAS API",
    ENHANCED_TXNS: "Enhanced Transactions",
    PRIORITY_FEES: "Priority Fee API",
    WALLET_API: "Wallet API",
    ZK_COMPRESSION: "ZK Compression",
    OTHER: "Other",
  };
  return map[p] ?? p;
}

function capitalize(s: string) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

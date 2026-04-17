import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "ok" | "warn" | "err" | "muted";

const TONES: Record<Tone, string> = {
  neutral:
    "border-border-subtle bg-bg-raised text-fg-secondary",
  accent:
    "border-accent/30 bg-accent/10 text-accent",
  ok: "border-status-ok/30 bg-status-ok/10 text-status-ok",
  warn: "border-status-warn/30 bg-status-warn/10 text-status-warn",
  err: "border-status-err/30 bg-status-err/10 text-status-err",
  muted: "border-border-subtle/70 bg-transparent text-fg-muted",
};

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-2xs font-medium uppercase tracking-[0.07em] leading-none",
        "h-[18px]",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function toneForTrackStatus(status: string): Tone {
  switch (status) {
    case "TRACKED":
      return "ok";
    case "WATCHLIST":
      return "warn";
    case "REJECTED":
      return "err";
    case "CANDIDATE":
    default:
      return "neutral";
  }
}

// Segment tones are grouped semantically so related segments read together.
const SEGMENT_TONE: Record<string, Tone> = {
  DEX: "accent",
  DEFI: "accent",
  TRADING: "accent",
  NFT: "warn",
  GAMING: "warn",
  CONSUMER: "warn",
  WALLET: "ok",
  STABLECOIN: "ok",
  PAYMENTS: "ok",
  RWA: "err",
  INFRA: "neutral",
  TOOLING: "neutral",
  OTHER: "muted",
};

export function toneForSegment(segment: string | null | undefined): Tone {
  if (!segment) return "muted";
  return SEGMENT_TONE[segment] ?? "neutral";
}

export function toneForTargetStatus(status: string): Tone {
  switch (status) {
    case "OPEN":
      return "neutral";
    case "WORKING":
    case "CONTACTED":
      return "accent";
    case "MEETING_SET":
    case "WON":
      return "ok";
    case "PASSED":
      return "muted";
    default:
      return "neutral";
  }
}

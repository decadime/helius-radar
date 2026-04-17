// Named badges for domain values. Callers pass the raw enum string and get a
// consistently colored, consistently cased pill. Thin wrappers over StatusPill.

import { prettifyEnum } from "@/lib/format";
import { RpcProvider } from "@/lib/enums";
import {
  isCompetitorProvider,
  providerDisplay,
} from "@/lib/rpc-providers";
import {
  StatusPill,
  toneForSegment,
  toneForTargetStatus,
  toneForTrackStatus,
} from "./StatusPill";

export function SegmentBadge({ value }: { value: string }) {
  return <StatusPill tone={toneForSegment(value)}>{value}</StatusPill>;
}

export function TrackStatusBadge({ value }: { value: string }) {
  return (
    <StatusPill tone={toneForTrackStatus(value)}>
      {prettifyEnum(value)}
    </StatusPill>
  );
}

export function TargetStatusBadge({ value }: { value: string }) {
  return (
    <StatusPill tone={toneForTargetStatus(value)}>
      {prettifyEnum(value)}
    </StatusPill>
  );
}

export function WedgeBadge({ value }: { value: string }) {
  return <StatusPill tone="accent">{value}</StatusPill>;
}

export function RpcProviderBadge({ value }: { value: RpcProvider | null }) {
  if (!value) {
    return <StatusPill tone="muted">not scanned</StatusPill>;
  }
  if (value === RpcProvider.HELIUS) {
    return <StatusPill tone="ok">Helius</StatusPill>;
  }
  if (value === RpcProvider.PROXIED) {
    return <StatusPill tone="muted">proxied</StatusPill>;
  }
  if (value === RpcProvider.UNKNOWN) {
    return <StatusPill tone="muted">unknown</StatusPill>;
  }
  // Public Solana endpoint and paid competitors are all displacement targets.
  const tone = isCompetitorProvider(value) ? "warn" : "neutral";
  return <StatusPill tone={tone}>{providerDisplay(value)}</StatusPill>;
}

// Named badges for domain values. Callers pass the raw enum string and get a
// consistently colored, consistently cased pill. Thin wrappers over StatusPill.

import { prettifyEnum } from "@/lib/format";
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

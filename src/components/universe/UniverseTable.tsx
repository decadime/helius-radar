"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/Panel";
import {
  RpcProviderBadge,
  SegmentBadge,
  TrackStatusBadge,
} from "@/components/ui/Badges";
import { formatScore } from "@/lib/format";
import type { RpcProvider } from "@/lib/enums";

export type UniverseRow = {
  id: string;
  companyName: string;
  domain: string | null;
  segment: string;
  trackStatus: string;
  identificationScore: number | null;
  confidence: number | null;
  recommendedWedge: string | null;
  source: string | null;
  rpcProvider: RpcProvider | null;
};

export function UniverseTable({ rows }: { rows: UniverseRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/accounts/${r.id}`)}
      empty={
        <EmptyState
          title="No accounts match these filters"
          description="Adjust or clear the filters, or import accounts into the universe."
          className="border-0 bg-transparent py-10"
        />
      }
    />
  );
}

const columns: Column<UniverseRow>[] = [
  {
    key: "company",
    header: "Company",
    render: (r) => (
      <div className="min-w-0 truncate font-medium text-fg-primary">
        {r.companyName}
      </div>
    ),
  },
  {
    key: "domain",
    header: "Domain",
    render: (r) =>
      r.domain ? (
        <span className="font-mono text-[12px] text-fg-secondary">
          {r.domain}
        </span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "segment",
    header: "Segment",
    render: (r) => <SegmentBadge value={r.segment} />,
  },
  {
    key: "trackStatus",
    header: "Track",
    render: (r) => <TrackStatusBadge value={r.trackStatus} />,
  },
  {
    key: "identificationScore",
    header: "ID score",
    align: "right",
    render: (r) => <ScoreCell value={r.identificationScore} />,
  },
  {
    key: "confidence",
    header: "Confidence",
    align: "right",
    render: (r) => <ScoreCell value={r.confidence} />,
  },
  {
    key: "recommendedWedge",
    header: "Wedge",
    render: (r) =>
      r.recommendedWedge ? (
        <span className="text-fg-secondary">{r.recommendedWedge}</span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "rpcProvider",
    header: "RPC",
    render: (r) => <RpcProviderBadge value={r.rpcProvider} />,
  },
  {
    key: "source",
    header: "Source",
    render: (r) =>
      r.source ? (
        <span className="text-fg-muted">{r.source}</span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
];

function ScoreCell({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-fg-muted">—</span>;
  }
  return <span className="tabular-nums text-fg-primary">{formatScore(value)}</span>;
}

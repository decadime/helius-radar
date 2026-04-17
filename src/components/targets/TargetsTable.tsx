"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/Panel";
import {
  SegmentBadge,
  TargetStatusBadge,
  WedgeBadge,
} from "@/components/ui/Badges";

export type TargetRow = {
  id: string;
  accountId: string;
  priorityRank: number;
  companyName: string;
  segment: string;
  whyNow: string | null;
  recommendedWedge: string | null;
  nextAction: string | null;
  status: string;
};

export function TargetsTable({ rows }: { rows: TargetRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/accounts/${r.accountId}`)}
      empty={
        <EmptyState
          title="No targets queued for this date"
          description="Generate the daily target list once tracked accounts have fresh signal activity, or pick another day."
          className="border-0 bg-transparent py-10"
        />
      }
    />
  );
}

const columns: Column<TargetRow>[] = [
  {
    key: "rank",
    header: "#",
    align: "right",
    width: "52px",
    render: (r) => <RankBadge rank={r.priorityRank} />,
  },
  {
    key: "company",
    header: "Company",
    render: (r) => (
      <span className="font-medium text-fg-primary">{r.companyName}</span>
    ),
  },
  {
    key: "segment",
    header: "Segment",
    render: (r) => <SegmentBadge value={r.segment} />,
  },
  {
    key: "whyNow",
    header: "Why now",
    render: (r) =>
      r.whyNow ? (
        <span className="line-clamp-1 text-[12.5px] text-fg-secondary">
          {r.whyNow}
        </span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "wedge",
    header: "Wedge",
    render: (r) =>
      r.recommendedWedge ? (
        <WedgeBadge value={r.recommendedWedge} />
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "nextAction",
    header: "Next action",
    render: (r) =>
      r.nextAction ? (
        <span className="line-clamp-1 text-[12.5px] text-fg-secondary">
          {r.nextAction}
        </span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <TargetStatusBadge value={r.status} />,
  },
];

function RankBadge({ rank }: { rank: number }) {
  const top = rank <= 3;
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-mono tabular-nums ${
        top ? "bg-accent/15 text-accent" : "bg-bg-raised text-fg-muted"
      }`}
    >
      {rank}
    </span>
  );
}

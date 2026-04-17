"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/Panel";
import { SegmentBadge } from "@/components/ui/Badges";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/cn";

export type TrackedRow = {
  id: string;
  companyName: string;
  segment: string;
  recommendedWedge: string | null;
  identificationScore: number | null;
  latestSignalTitle: string | null;
  freshnessLabel: string | null;
  freshnessDays: number | null;
};

export function TrackedTable({ rows }: { rows: TrackedRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/accounts/${r.id}`)}
      empty={
        <EmptyState
          title="No tracked accounts"
          description="Adjust filters, or promote accounts from the Candidate Universe."
          className="border-0 bg-transparent py-10"
        />
      }
    />
  );
}

const columns: Column<TrackedRow>[] = [
  {
    key: "company",
    header: "Company",
    render: (r) => (
      <div className="truncate font-medium text-fg-primary">
        {r.companyName}
      </div>
    ),
  },
  {
    key: "segment",
    header: "Segment",
    render: (r) => <SegmentBadge value={r.segment} />,
  },
  {
    key: "latestSignal",
    header: "Latest signal",
    render: (r) =>
      r.latestSignalTitle ? (
        <span className="line-clamp-1 text-[12.5px] text-fg-primary">
          {r.latestSignalTitle}
        </span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "freshness",
    header: "Freshness",
    render: (r) =>
      r.freshnessLabel ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[12px] tabular-nums",
            freshnessTone(r.freshnessDays)
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              freshnessDot(r.freshnessDays)
            )}
          />
          {r.freshnessLabel}
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
        <span className="text-fg-secondary">{r.recommendedWedge}</span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "score",
    header: "ID score",
    align: "right",
    render: (r) =>
      r.identificationScore !== null ? (
        <span className="tabular-nums text-fg-primary">
          {formatScore(r.identificationScore)}
        </span>
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
];

function freshnessTone(days: number | null) {
  if (days === null) return "text-fg-muted";
  if (days === 0) return "text-status-ok";
  if (days <= 7) return "text-fg-primary";
  if (days <= 30) return "text-status-warn";
  return "text-fg-muted";
}
function freshnessDot(days: number | null) {
  if (days === null) return "bg-fg-faint";
  if (days === 0) return "bg-status-ok";
  if (days <= 7) return "bg-accent";
  if (days <= 30) return "bg-status-warn";
  return "bg-fg-faint";
}

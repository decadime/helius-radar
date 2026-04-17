import Link from "next/link";
import {
  getAccountCounts,
  getRecentSignals,
  getSignalsCountSince,
  getTargetsForDate,
  getWedgeDistribution,
} from "@/lib/queries";
import { addDays, todayUTC } from "@/lib/date";
import { formatCount, isoDateUTC } from "@/lib/format";
import { PageContainer } from "@/components/ui/PageContainer";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { Panel, EmptyState } from "@/components/ui/Panel";
import { TargetStatusBadge, WedgeBadge } from "@/components/ui/Badges";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { WedgeBars } from "@/components/dashboard/WedgeBar";
import {
  SignalList,
  type SignalListItem,
} from "@/components/dashboard/SignalList";

export const dynamic = "force-dynamic";

type PriorityRow = {
  id: string;
  rank: number;
  accountId: string;
  company: string;
  whyNow: string;
  wedge: string | null;
  nextAction: string;
  status: string;
};

async function getDashboardData() {
  const today = todayUTC();
  const sevenDaysAgo = addDays(today, -7);

  const [counts, signalsLast7d, targets, recentSignalsRaw, wedges] =
    await Promise.all([
      getAccountCounts(),
      getSignalsCountSince(sevenDaysAgo),
      getTargetsForDate(today, 5),
      getRecentSignals(5),
      getWedgeDistribution(8),
    ]);

  const priorities: PriorityRow[] = targets.map((t) => ({
    id: t.id,
    rank: t.priorityRank,
    accountId: t.accountId,
    company: t.account.companyName,
    whyNow: t.whyNow ?? "—",
    wedge: t.recommendedWedge,
    nextAction: t.nextAction ?? "—",
    status: t.status,
  }));

  const recentSignals: SignalListItem[] = recentSignalsRaw.map((s) => ({
    id: s.id,
    title: s.title,
    signalType: s.signalType,
    detectedAt: s.detectedAt,
    summary: s.summary,
    sourceUrl: s.sourceUrl,
    account: s.account,
  }));

  return { counts, signalsLast7d, priorities, recentSignals, wedges };
}

const priorityColumns: Column<PriorityRow>[] = [
  {
    key: "rank",
    header: "#",
    align: "right",
    width: "48px",
    render: (r) => <span className="font-mono text-fg-muted">{r.rank}</span>,
  },
  {
    key: "company",
    header: "Company",
    render: (r) => (
      <Link
        href={`/accounts/${r.accountId}`}
        className="font-medium text-fg-primary hover:underline"
      >
        {r.company}
      </Link>
    ),
  },
  {
    key: "whyNow",
    header: "Why now",
    render: (r) => <span className="text-fg-secondary">{r.whyNow}</span>,
  },
  {
    key: "wedge",
    header: "Wedge",
    render: (r) =>
      r.wedge ? (
        <WedgeBadge value={r.wedge} />
      ) : (
        <span className="text-fg-muted">—</span>
      ),
  },
  {
    key: "nextAction",
    header: "Next action",
    render: (r) => <span className="text-fg-secondary">{r.nextAction}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <TargetStatusBadge value={r.status} />,
  },
];

export default async function DashboardPage() {
  const { counts, signalsLast7d, priorities, recentSignals, wedges } =
    await getDashboardData();
  const today = isoDateUTC();

  return (
    <PageContainer
      title="Dashboard"
      description="Live snapshot of the candidate universe, tracked coverage, and today's outbound priorities."
      actions={
        <span className="text-2xs font-mono text-fg-muted">
          as of{" "}
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      }
    >
      <StatGrid>
        <StatCard
          label="Candidate universe"
          value={formatCount(counts.total)}
          hint="total accounts"
        />
        <StatCard
          label="Tracked"
          value={formatCount(counts.tracked)}
          hint="approved coverage"
          tone="up"
        />
        <StatCard
          label="Watchlist"
          value={formatCount(counts.watchlist)}
          hint="monitored"
        />
        <StatCard
          label="Rejected"
          value={formatCount(counts.rejected)}
          hint="disqualified"
          tone="down"
        />
      </StatGrid>

      <StatGrid cols={2}>
        <StatCard
          label="Signals · last 7d"
          value={formatCount(signalsLast7d)}
          hint="detected"
        />
        <StatCard
          label="Daily targets · today"
          value={formatCount(priorities.length)}
          hint={today}
        />
      </StatGrid>

      <Panel
        title="Today's BD priorities"
        subtitle={`Top ${priorities.length || 5} targets for ${today}`}
        padded={false}
        actions={
          <Link
            href="/targets"
            className="text-[12px] text-fg-secondary hover:text-fg-primary"
          >
            View all →
          </Link>
        }
      >
        <DataTable
          columns={priorityColumns}
          rows={priorities}
          getRowKey={(r) => r.id}
          empty={
            <EmptyState
              title="No priorities queued for today"
              description="Generate the daily target list once tracked accounts have fresh signal activity."
              className="border-0 bg-transparent py-10"
            />
          }
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Recent signals"
          subtitle="Latest 5 observations"
          className="lg:col-span-2"
          actions={
            <span className="text-2xs text-fg-muted">
              {signalsLast7d} in last 7d
            </span>
          }
        >
          {recentSignals.length === 0 ? (
            <EmptyState
              title="No signals yet"
              description="Signals will stream in here once an ingest source is connected."
            />
          ) : (
            <SignalList items={recentSignals} />
          )}
        </Panel>

        <Panel title="Top wedges" subtitle="Recommended wedge distribution">
          {wedges.length === 0 ? (
            <EmptyState
              title="No wedges yet"
              description="Populated as accounts receive a recommended Helius product wedge."
            />
          ) : (
            <WedgeBars rows={wedges} />
          )}
        </Panel>
      </div>
    </PageContainer>
  );
}

import { notFound } from "next/navigation";
import { getAccountDetail } from "@/lib/queries";
import { todayUTC } from "@/lib/date";
import { formatScore, isoDateUTC } from "@/lib/format";
import { computeBdView } from "@/lib/bdView";
import { PageContainer, Breadcrumb } from "@/components/ui/PageContainer";
import { Panel, EmptyState } from "@/components/ui/Panel";
import {
  SegmentBadge,
  TargetStatusBadge,
  TrackStatusBadge,
} from "@/components/ui/Badges";
import { BdViewCard } from "@/components/account/BdViewCard";
import { TrackStatusControls } from "@/components/account/TrackStatusControls";
import { TrackStatus } from "@/lib/enums";
import {
  ProductMatchList,
  type ProductMatchItem,
} from "@/components/account/ProductMatchList";
import {
  SignalTimeline,
  type TimelineSignal,
} from "@/components/account/SignalTimeline";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const account = await getAccountDetail(params.id, todayUTC());
  if (!account) notFound();

  const signals: TimelineSignal[] = account.signals.map((s) => ({
    id: s.id,
    signalType: s.signalType,
    title: s.title,
    summary: s.summary,
    sourceUrl: s.sourceUrl,
    detectedAt: s.detectedAt,
    confidence: s.confidence,
    impactScore: s.impactScore,
  }));

  const productMatches: ProductMatchItem[] = account.productMatches.map(
    (m) => ({
      id: m.id,
      heliusProduct: m.heliusProduct,
      matchScore: m.matchScore,
      rationale: m.rationale,
      primaryMatch: m.primaryMatch,
    })
  );

  const todayTarget = account.dailyTargets[0] ?? null;

  const bdView = computeBdView({
    segment: account.segment,
    recommendedWedge: account.recommendedWedge,
    description: account.description,
    heliusFitSummary: account.heliusFitSummary,
    signals: signals.map((s) => ({
      signalType: s.signalType,
      title: s.title,
      detectedAt: s.detectedAt,
    })),
    productMatches: productMatches.map((m) => ({
      heliusProduct: m.heliusProduct,
      matchScore: m.matchScore,
      primaryMatch: m.primaryMatch,
      rationale: m.rationale,
    })),
    todayTarget: todayTarget
      ? {
          whyNow: todayTarget.whyNow,
          nextAction: todayTarget.nextAction,
          recommendedWedge: todayTarget.recommendedWedge,
        }
      : null,
  });

  return (
    <PageContainer
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Tracked Accounts", href: "/tracked" },
            { label: account.companyName },
          ]}
        />
      }
    >
      <AccountHeader account={account} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Overview">
            <OverviewBody
              description={account.description}
              heliusFitSummary={account.heliusFitSummary}
              source={account.source}
              sourceUrl={account.sourceUrl}
            />
          </Panel>

          <Panel
            title="Signals"
            subtitle={`${signals.length} observation${signals.length === 1 ? "" : "s"}`}
          >
            {signals.length === 0 ? (
              <EmptyState
                title="No signals recorded"
                description="Events will appear here as a chronological timeline."
              />
            ) : (
              <SignalTimeline signals={signals} />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <BdViewCard view={bdView} />

          <Panel title="Today's target" subtitle={isoDateUTC(todayUTC())}>
            {todayTarget ? (
              <TodayTargetBody
                rank={todayTarget.priorityRank}
                whyNow={todayTarget.whyNow}
                recommendedWedge={todayTarget.recommendedWedge}
                nextAction={todayTarget.nextAction}
                status={todayTarget.status}
              />
            ) : (
              <EmptyState
                title="Not on today's queue"
                description="This account is not in today's priority list."
              />
            )}
          </Panel>

          <Panel
            title="Product matches"
            subtitle={`${productMatches.length} scored`}
          >
            {productMatches.length === 0 ? (
              <EmptyState
                title="No product matches"
                description="Run a match pass to score Helius products against this account."
              />
            ) : (
              <ProductMatchList matches={productMatches} />
            )}
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}

// -----------------------------------------------------------------------------

type AccountLike = {
  id: string;
  companyName: string;
  domain: string | null;
  segment: string;
  trackStatus: TrackStatus;
  identificationScore: number | null;
  confidence: number | null;
  recommendedWedge: string | null;
};

function AccountHeader({ account }: { account: AccountLike }) {
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight text-fg-primary">
            {account.companyName}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-secondary">
            {account.domain ? (
              <a
                href={`https://${account.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-fg-primary"
              >
                {account.domain} ↗
              </a>
            ) : (
              <span className="text-fg-muted">no domain</span>
            )}
            <span className="text-fg-faint">·</span>
            <SegmentBadge value={account.segment} />
            <TrackStatusBadge value={account.trackStatus} />
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex items-stretch divide-x divide-border-subtle rounded-md border border-border-subtle bg-bg-raised">
            <Metric label="ID score" value={formatScore(account.identificationScore)} />
            <Metric label="Confidence" value={formatScore(account.confidence)} />
            <Metric label="Wedge" value={account.recommendedWedge ?? "—"} mono={false} />
          </div>
          <TrackStatusControls accountId={account.id} current={account.trackStatus} />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-[104px] flex-col justify-center px-4 py-2">
      <span className="text-2xs uppercase tracking-[0.08em] text-fg-muted">
        {label}
      </span>
      <span
        className={`mt-0.5 text-[14px] font-semibold text-fg-primary ${
          mono ? "tabular-nums" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------

function OverviewBody({
  description,
  heliusFitSummary,
  source,
  sourceUrl,
}: {
  description: string | null;
  heliusFitSummary: string | null;
  source: string | null;
  sourceUrl: string | null;
}) {
  return (
    <dl className="space-y-4">
      <Field label="Description">
        {description ? (
          <p className="text-[13px] leading-relaxed text-fg-primary">
            {description}
          </p>
        ) : (
          <p className="text-[12.5px] text-fg-muted">No description on file.</p>
        )}
      </Field>

      <Field label="Helius fit summary">
        {heliusFitSummary ? (
          <p className="text-[13px] leading-relaxed text-fg-primary">
            {heliusFitSummary}
          </p>
        ) : (
          <p className="text-[12.5px] text-fg-muted">Not yet synthesized.</p>
        )}
      </Field>

      <Field label="Source">
        <div className="flex items-center gap-3 text-[12.5px]">
          <span className="text-fg-primary">{source ?? "—"}</span>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-fg-muted hover:text-fg-primary"
            >
              {sourceUrl} ↗
            </a>
          )}
        </div>
      </Field>
    </dl>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-fg-muted">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

// -----------------------------------------------------------------------------

function TodayTargetBody({
  rank,
  whyNow,
  recommendedWedge,
  nextAction,
  status,
}: {
  rank: number;
  whyNow: string | null;
  recommendedWedge: string | null;
  nextAction: string | null;
  status: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 font-mono text-[11px] tabular-nums text-accent">
            {rank}
          </span>
          <span className="text-[12.5px] font-medium text-fg-primary">
            Priority rank
          </span>
        </div>
        <TargetStatusBadge value={status} />
      </div>

      {recommendedWedge && (
        <div>
          <div className="text-2xs uppercase tracking-[0.08em] text-fg-muted">
            Wedge
          </div>
          <div className="mt-0.5 text-[13px] text-accent">
            {recommendedWedge}
          </div>
        </div>
      )}

      <div>
        <div className="text-2xs uppercase tracking-[0.08em] text-fg-muted">
          Why now
        </div>
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-fg-primary">
          {whyNow ?? "—"}
        </div>
      </div>

      <div>
        <div className="text-2xs uppercase tracking-[0.08em] text-fg-muted">
          Next action
        </div>
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-fg-primary">
          {nextAction ?? "—"}
        </div>
      </div>
    </div>
  );
}

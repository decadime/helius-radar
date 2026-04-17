import {
  getTrackedAccounts,
  getTrackedWedgeOptions,
} from "@/lib/queries";
import { freshness } from "@/lib/format";
import { PageContainer } from "@/components/ui/PageContainer";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { TrackedFilters } from "@/components/tracked/TrackedFilters";
import {
  TrackedTable,
  type TrackedRow,
} from "@/components/tracked/TrackedTable";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  wedge?: string;
};

function buildExportHref(q: string | null, wedge: string | null) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (wedge) qs.set("wedge", wedge);
  return qs.toString() ? `/api/tracked/export?${qs.toString()}` : "/api/tracked/export";
}

export default async function TrackedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = searchParams.q?.trim() || null;
  const wedge = searchParams.wedge?.trim() || null;

  const [wedgeOptions, accounts] = await Promise.all([
    getTrackedWedgeOptions(),
    getTrackedAccounts({ q, wedge }),
  ]);

  const now = new Date();
  const rows: TrackedRow[] = accounts.map((a) => {
    const latest = a.signals[0];
    const { label, days } = freshness(latest?.detectedAt, now);
    return {
      id: a.id,
      companyName: a.companyName,
      segment: a.segment,
      recommendedWedge: a.recommendedWedge,
      identificationScore: a.identificationScore,
      rpcProvider: a.rpcProvider,
      latestSignalTitle: latest?.title ?? null,
      freshnessLabel: label,
      freshnessDays: days,
    };
  });

  return (
    <PageContainer
      title="Tracked Accounts"
      description="Active coverage. Signal activity from these accounts feeds the daily target queue."
      actions={
        <ButtonLink variant="secondary" href={buildExportHref(q, wedge)}>
          Export CSV
        </ButtonLink>
      }
    >
      <TrackedFilters
        q={q}
        wedge={wedge}
        wedgeOptions={wedgeOptions}
        totalResults={rows.length}
      />

      <Panel padded={false}>
        <TrackedTable rows={rows} />
      </Panel>
    </PageContainer>
  );
}

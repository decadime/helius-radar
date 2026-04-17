import { getTargetsForDate } from "@/lib/queries";
import { TargetStatus } from "@/lib/enums";
import { parseISODate, todayUTC } from "@/lib/date";
import { isoDateUTC } from "@/lib/format";
import { PageContainer } from "@/components/ui/PageContainer";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { RegenerateButton } from "@/components/targets/RegenerateButton";
import { MAX_UI_REGENERATIONS_PER_DAY } from "@/lib/rateLimits";
import { getUiRegenerationsRemaining } from "./actions";
import { DateSelector } from "@/components/targets/DateSelector";
import { TargetsSummary } from "@/components/targets/TargetsSummary";
import {
  TargetsTable,
  type TargetRow,
} from "@/components/targets/TargetsTable";

export const dynamic = "force-dynamic";

type SearchParams = { date?: string };

// "Open" = anything not yet resolved. Closed buckets are WON and PASSED.
const OPEN_STATUSES: string[] = [
  TargetStatus.OPEN,
  TargetStatus.WORKING,
  TargetStatus.CONTACTED,
  TargetStatus.MEETING_SET,
];

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const today = todayUTC();
  const selected = parseISODate(searchParams.date) ?? today;
  const selectedIso = isoDateUTC(selected);
  const todayIso = isoDateUTC(today);

  const [targets, regenerationsRemaining] = await Promise.all([
    getTargetsForDate(selected),
    getUiRegenerationsRemaining(),
  ]);

  const rows: TargetRow[] = targets.map((t) => ({
    id: t.id,
    accountId: t.accountId,
    priorityRank: t.priorityRank,
    companyName: t.account.companyName,
    segment: t.account.segment,
    whyNow: t.whyNow,
    recommendedWedge: t.recommendedWedge,
    nextAction: t.nextAction,
    status: t.status,
  }));

  const openCount = rows.filter((r) => OPEN_STATUSES.includes(r.status)).length;
  const topWedge = rows.length > 0 ? rows[0].recommendedWedge : null;

  const isToday = selectedIso === todayIso;
  const longDate = selected.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <PageContainer
      title="Daily Targets"
      description={`${isToday ? "Today" : longDate} · ranked outbound shortlist driven by the current signal window.`}
      actions={
        <>
          <DateSelector value={selectedIso} today={todayIso} />
          <ButtonLink
            variant="secondary"
            href={
              isToday
                ? "/api/targets/export"
                : `/api/targets/export?date=${selectedIso}`
            }
            download={`daily-targets-${selectedIso}.csv`}
          >
            Export CSV
          </ButtonLink>
          <RegenerateButton
            remaining={regenerationsRemaining}
            dailyLimit={MAX_UI_REGENERATIONS_PER_DAY}
          />
        </>
      }
    >
      <TargetsSummary total={rows.length} open={openCount} topWedge={topWedge} />

      <Panel
        title={`Queue · ${selectedIso}`}
        subtitle={`${rows.length} ranked target${rows.length === 1 ? "" : "s"}`}
        padded={false}
      >
        <TargetsTable rows={rows} />
      </Panel>
    </PageContainer>
  );
}

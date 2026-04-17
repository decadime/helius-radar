import { getUniverse, normalizeUniverseFilters } from "@/lib/queries";
import { PageContainer } from "@/components/ui/PageContainer";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { UniverseFilters } from "@/components/universe/UniverseFilters";
import {
  UniverseTable,
  type UniverseRow,
} from "@/components/universe/UniverseTable";

export const dynamic = "force-dynamic";

type SearchParams = {
  segment?: string;
  status?: string;
};

export default async function UniversePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = normalizeUniverseFilters(searchParams);
  const rows = (await getUniverse(filters)) as UniverseRow[];

  const exportQs = new URLSearchParams();
  if (filters.segment) exportQs.set("segment", filters.segment);
  if (filters.status) exportQs.set("status", filters.status);
  const exportHref = exportQs.toString()
    ? `/api/universe/export?${exportQs.toString()}`
    : "/api/universe/export";

  return (
    <PageContainer
      title="Candidate Universe"
      description="The full set of accounts being evaluated for coverage. Ranked by identification score."
      actions={
        <ButtonLink variant="secondary" href={exportHref}>
          Export CSV
        </ButtonLink>
      }
    >
      <UniverseFilters
        segment={filters.segment}
        status={filters.status}
        totalResults={rows.length}
      />

      <Panel padded={false}>
        <UniverseTable rows={rows} />
      </Panel>
    </PageContainer>
  );
}

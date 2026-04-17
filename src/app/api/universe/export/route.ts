import type { NextRequest } from "next/server";
import { getUniverse, normalizeUniverseFilters } from "@/lib/queries";
import { isoDateUTC, prettifyEnum } from "@/lib/format";
import { buildCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

const HEADERS = [
  "company",
  "domain",
  "segment",
  "track_status",
  "identification_score",
  "confidence",
  "recommended_wedge",
  "source",
  "source_url",
];

export async function GET(req: NextRequest) {
  const filters = normalizeUniverseFilters({
    segment: req.nextUrl.searchParams.get("segment") ?? undefined,
    status: req.nextUrl.searchParams.get("status") ?? undefined,
  });

  const rows = await getUniverse(filters);
  const body = buildCsv(
    HEADERS,
    rows.map((r) => [
      r.companyName,
      r.domain ?? "",
      r.segment,
      prettifyEnum(r.trackStatus),
      r.identificationScore ?? "",
      r.confidence ?? "",
      r.recommendedWedge ?? "",
      r.source ?? "",
      "", // sourceUrl not selected on the list query; fetch on detail if needed
    ])
  );

  return csvResponse(`candidate-universe-${isoDateUTC()}.csv`, body);
}

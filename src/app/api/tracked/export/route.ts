import type { NextRequest } from "next/server";
import { getTrackedAccounts } from "@/lib/queries";
import { freshness, isoDateUTC } from "@/lib/format";
import { buildCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

const HEADERS = [
  "company",
  "segment",
  "latest_signal",
  "freshness",
  "freshness_days",
  "recommended_wedge",
  "identification_score",
];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || null;
  const wedge = req.nextUrl.searchParams.get("wedge")?.trim() || null;

  const accounts = await getTrackedAccounts({ q, wedge });
  const now = new Date();

  const body = buildCsv(
    HEADERS,
    accounts.map((a) => {
      const latest = a.signals[0];
      const { label, days } = freshness(latest?.detectedAt, now);
      return [
        a.companyName,
        a.segment,
        latest?.title ?? "",
        label ?? "",
        days ?? "",
        a.recommendedWedge ?? "",
        a.identificationScore ?? "",
      ];
    })
  );

  return csvResponse(`tracked-accounts-${isoDateUTC()}.csv`, body);
}

import type { NextRequest } from "next/server";
import { getTargetsForDate } from "@/lib/queries";
import { parseISODate, todayUTC } from "@/lib/date";
import { isoDateUTC, prettifyEnum } from "@/lib/format";
import { buildCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

const HEADERS = [
  "priority_rank",
  "company",
  "segment",
  "why_now",
  "recommended_wedge",
  "rpc_provider",
  "next_action",
  "status",
];

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = parseISODate(dateParam) ?? todayUTC();
  const iso = isoDateUTC(date);

  const targets = await getTargetsForDate(date);

  const body = buildCsv(
    HEADERS,
    targets.map((t) => [
      t.priorityRank,
      t.account.companyName,
      t.account.segment,
      t.whyNow ?? "",
      t.recommendedWedge ?? "",
      t.account.rpcProvider ?? "",
      t.nextAction ?? "",
      prettifyEnum(t.status),
    ])
  );

  return csvResponse(`daily-targets-${iso}.csv`, body);
}

import Link from "next/link";
import { relativeTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export type SignalListItem = {
  id: string;
  title: string;
  signalType: string;
  detectedAt: Date;
  summary: string | null;
  sourceUrl: string | null;
  account: { id: string; companyName: string };
};

export function SignalList({ items }: { items: SignalListItem[] }) {
  return (
    <ul className="divide-y divide-border-subtle">
      {items.map((s) => (
        <li key={s.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusPill tone="accent">{prettifyType(s.signalType)}</StatusPill>
                <Link
                  href={`/accounts/${s.account.id}`}
                  className="truncate text-[12.5px] font-medium text-fg-primary hover:underline"
                >
                  {s.account.companyName}
                </Link>
              </div>
              <div className="mt-1 truncate text-[13px] text-fg-primary">
                {s.title}
              </div>
              {s.summary ? (
                <div className="mt-0.5 line-clamp-1 text-[12px] text-fg-secondary">
                  {s.summary}
                </div>
              ) : null}
            </div>
            <div className="shrink-0 pt-0.5 text-right text-2xs text-fg-muted">
              {relativeTime(s.detectedAt)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function prettifyType(t: string) {
  return t.toLowerCase().replace(/_/g, " ");
}

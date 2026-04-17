import { relativeTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

export type TimelineSignal = {
  id: string;
  signalType: string;
  title: string;
  summary: string | null;
  sourceUrl: string | null;
  detectedAt: Date;
  confidence: number | null;
  impactScore: number | null;
};

export function SignalTimeline({ signals }: { signals: TimelineSignal[] }) {
  return (
    <ol className="relative space-y-0">
      {signals.map((s, i) => {
        const isLast = i === signals.length - 1;
        return (
          <li key={s.id} className="relative pl-6">
            <span className="absolute left-[7px] top-3.5 h-1.5 w-1.5 rounded-full bg-accent ring-4 ring-bg-panel" />
            {!isLast && (
              <span className="absolute left-[10.5px] top-5 h-full w-px bg-border-subtle" />
            )}

            <div className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="accent">
                      {prettifyType(s.signalType)}
                    </StatusPill>
                    <time
                      dateTime={s.detectedAt.toISOString()}
                      className="text-2xs tabular-nums text-fg-muted"
                    >
                      {s.detectedAt.toISOString().slice(0, 10)} · {relativeTime(s.detectedAt)}
                    </time>
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-fg-primary">
                    {s.title}
                  </div>
                  {s.summary && (
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-secondary">
                      {s.summary}
                    </p>
                  )}
                </div>
                {s.sourceUrl && (
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-2xs text-fg-muted hover:text-fg-primary"
                  >
                    Source ↗
                  </a>
                )}
              </div>

              {(s.confidence !== null || s.impactScore !== null) && (
                <div className="mt-2 flex items-center gap-4 text-2xs text-fg-muted">
                  {s.confidence !== null && (
                    <Meter label="Confidence" value={s.confidence} />
                  )}
                  {s.impactScore !== null && (
                    <Meter label="Impact" value={s.impactScore} />
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="uppercase tracking-[0.06em]">{label}</span>
      <span className="h-1 w-16 overflow-hidden rounded-full bg-bg-raised">
        <span
          className="block h-full bg-accent/70"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="tabular-nums text-fg-secondary">{value.toFixed(2)}</span>
    </span>
  );
}

function prettifyType(t: string) {
  return t.toLowerCase().replace(/_/g, " ");
}

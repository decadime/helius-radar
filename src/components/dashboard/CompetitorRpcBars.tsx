import type { RpcProvider } from "@/lib/enums";
import { providerDisplay } from "@/lib/rpc-providers";

type Row = { provider: RpcProvider; count: number };

/**
 * Proportional bars for the Competitor RPC landscape panel on the
 * Dashboard. Visually echoes WedgeBars but uses a warn-colored fill since
 * every row here represents a displacement target, not a friendly data
 * point.
 */
export function CompetitorRpcBars({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = Math.round((r.count / max) * 100);
        return (
          <li key={r.provider} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
              <span className="truncate text-fg-primary">
                {providerDisplay(r.provider)}
              </span>
              <span className="tabular-nums text-fg-muted">{r.count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-raised">
              <div
                className="h-full rounded-full bg-status-warn/70"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

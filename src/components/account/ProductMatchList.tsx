import { cn } from "@/lib/cn";
import { StatusPill } from "@/components/ui/StatusPill";
import { prettifyProduct } from "@/lib/bdView";
import { formatScore } from "@/lib/format";

export type ProductMatchItem = {
  id: string;
  heliusProduct: string;
  matchScore: number;
  rationale: string | null;
  primaryMatch: boolean;
};

export function ProductMatchList({ matches }: { matches: ProductMatchItem[] }) {
  const primary = matches.find((m) => m.primaryMatch);
  const secondary = matches.filter((m) => m.id !== primary?.id);

  return (
    <div className="space-y-4">
      {primary ? (
        <PrimaryMatchCard match={primary} />
      ) : matches.length > 0 ? (
        // No primary set: promote the top-scored match to anchor the section.
        <PrimaryMatchCard match={matches[0]} implicit />
      ) : null}

      {secondary.length > 0 && (
        <div>
          <SectionLabel>Secondary matches · {secondary.length}</SectionLabel>
          <ul className="mt-2 divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
            {secondary.map((m) => (
              <SecondaryMatchRow key={m.id} match={m} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Primary ──────────────────────────────────────────────────────────────────

function PrimaryMatchCard({
  match,
  implicit = false,
}: {
  match: ProductMatchItem;
  implicit?: boolean;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, match.matchScore)) * 100);
  return (
    <section className="relative overflow-hidden rounded-md border border-accent/40 bg-accent/5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <StatusPill tone="accent">
          {implicit ? "top match" : "primary match"}
        </StatusPill>
        <span className="text-2xs uppercase tracking-[0.08em] text-fg-muted">
          Helius
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pt-1">
        <h4 className="truncate text-[18px] font-semibold leading-tight text-fg-primary">
          {prettifyProduct(match.heliusProduct)}
        </h4>
        <div className="flex items-baseline gap-1">
          <span className="text-[22px] font-semibold tabular-nums text-accent">
            {formatScore(match.matchScore)}
          </span>
          <span className="text-2xs text-fg-muted">score</span>
        </div>
      </div>

      <div className="px-4 pt-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg-raised">
          <div
            className="h-full rounded-full bg-accent/70"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {match.rationale && (
        <p className="px-4 py-3 text-[12.5px] leading-relaxed text-fg-primary">
          {match.rationale}
        </p>
      )}
    </section>
  );
}

// ─── Secondary ────────────────────────────────────────────────────────────────

function SecondaryMatchRow({ match }: { match: ProductMatchItem }) {
  return (
    <li className="bg-bg-raised/30 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[12.5px] font-medium text-fg-primary">
          {prettifyProduct(match.heliusProduct)}
        </span>
        <span className="shrink-0 rounded-md border border-border-subtle bg-bg-panel px-1.5 py-0.5 text-[11px] font-mono tabular-nums text-fg-secondary">
          {formatScore(match.matchScore)}
        </span>
      </div>
      {match.rationale && (
        <p className={cn("mt-1 line-clamp-2 text-[12px] text-fg-secondary")}>
          {match.rationale}
        </p>
      )}
    </li>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-2xs font-medium uppercase tracking-[0.08em] text-fg-muted">
      {children}
    </div>
  );
}

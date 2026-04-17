import type { BdView } from "@/lib/bdView";

export function BdViewCard({ view }: { view: BdView }) {
  return (
    <section className="panel relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div>
          <h3 className="text-[13px] font-semibold text-fg-primary">BD view</h3>
          <p className="mt-0.5 text-2xs text-fg-muted">
            Derived from stored signals, matches, and the current target.
          </p>
        </div>
        <span className="text-2xs uppercase tracking-[0.08em] text-fg-muted">
          heuristic
        </span>
      </header>

      <dl className="divide-y divide-border-subtle">
        <Row label="Likely pain" value={view.likelyPain} />
        <Row label="Likely wedge" value={view.likelyWedge} tone="accent" />
        <Row label="Likely next move" value={view.likelyNextMove} />
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent";
}) {
  return (
    <div className="px-4 py-3">
      <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-fg-muted">
        {label}
      </dt>
      <dd
        className={
          tone === "accent"
            ? "mt-1 text-[13px] font-medium text-accent"
            : "mt-1 text-[13px] leading-relaxed text-fg-primary"
        }
      >
        {value}
      </dd>
    </div>
  );
}

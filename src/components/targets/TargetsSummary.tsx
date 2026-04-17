export function TargetsSummary({
  total,
  open,
  topWedge,
}: {
  total: number;
  open: number;
  topWedge: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3 rounded-lg border border-border-subtle bg-bg-panel px-5 py-3.5">
      <Item label="Targets" value={total.toLocaleString()} />
      <Divider />
      <Item
        label="Open"
        value={open.toLocaleString()}
        valueClass={open > 0 ? "text-status-ok" : undefined}
      />
      <Divider />
      <Item
        label="Top-priority wedge"
        value={topWedge ?? "—"}
        valueClass={topWedge ? "text-accent" : "text-fg-muted"}
      />
    </div>
  );
}

function Item({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-2xs font-medium uppercase tracking-[0.09em] text-fg-muted">
        {label}
      </span>
      <span
        className={`mt-1 text-[16px] font-semibold tabular-nums tracking-tight text-fg-primary ${
          valueClass ?? ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="h-8 w-px bg-border-subtle" />;
}

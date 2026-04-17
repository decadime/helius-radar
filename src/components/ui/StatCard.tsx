import { cn } from "@/lib/cn";

type Tone = "neutral" | "up" | "down";

type Props = {
  label: string;
  value: React.ReactNode;
  delta?: string;
  tone?: Tone;
  hint?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  hint,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative panel p-4 transition-colors hover:border-border-strong/80",
        className
      )}
    >
      {tone !== "neutral" && (
        <span
          className={cn(
            "absolute left-0 top-3 h-5 w-[2px] rounded-r-full",
            tone === "up" && "bg-status-ok/80",
            tone === "down" && "bg-status-err/80"
          )}
        />
      )}
      <div className="flex items-baseline justify-between gap-2">
        <span className="stat-label">{label}</span>
        {hint ? (
          <span className="text-2xs text-fg-muted">{hint}</span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="stat-value">{value}</div>
        {delta ? (
          <div
            className={cn(
              "text-[12px] tabular-nums",
              tone === "up" && "text-status-ok",
              tone === "down" && "text-status-err",
              tone === "neutral" && "text-fg-muted"
            )}
          >
            {delta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StatGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}) {
  const colClass =
    cols === 2
      ? "md:grid-cols-2"
      : cols === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 gap-3", colClass)}>{children}</div>
  );
}

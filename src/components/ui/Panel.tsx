import { cn } from "@/lib/cn";

type PanelProps = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
};

/**
 * Titled container with an optional header (title / subtitle / actions).
 * Use `padded={false}` when the body is a table or other edge-to-edge content.
 */
export function Panel({
  title,
  subtitle,
  actions,
  className,
  children,
  padded = true,
}: PanelProps) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[13px] font-semibold tracking-tight text-fg-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-2xs text-fg-muted">{subtitle}</p>
            )}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  hint,
  className,
}: {
  title: string;
  description?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-bg-raised text-fg-muted">
        <EmptyIcon />
      </div>
      <div className="text-[13.5px] font-medium text-fg-primary">{title}</div>
      {description && (
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-fg-secondary">
          {description}
        </p>
      )}
      {hint && (
        <p className="mt-3 text-2xs uppercase tracking-[0.09em] text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="5.25" />
      <path d="M6 8h4M8 6v4" strokeLinecap="round" />
    </svg>
  );
}

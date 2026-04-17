import { cn } from "@/lib/cn";

type Props = {
  title?: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Standard page wrapper. Provides consistent horizontal bounds, spacing,
 * and an optional header slot (title + description + actions).
 *
 * Pages that need a custom header can omit `title` and render their own.
 */
export function PageContainer({
  title,
  description,
  breadcrumb,
  actions,
  children,
  className,
}: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-6 py-6 lg:px-8 lg:py-8", className)}>
      {(title || breadcrumb || actions) && (
        <div className="mb-6 space-y-3">
          {breadcrumb ? (
            <div className="flex items-center gap-2 text-[12px] text-fg-muted">
              {breadcrumb}
            </div>
          ) : null}
          {(title || actions) && (
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                {title ? (
                  <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-fg-primary">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              ) : null}
            </div>
          )}
        </div>
      )}
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-fg-faint">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-fg-primary">
              {item.label}
            </a>
          ) : (
            <span className="text-fg-secondary">{item.label}</span>
          )}
        </span>
      ))}
    </>
  );
}

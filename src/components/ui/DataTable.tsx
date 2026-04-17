import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  headerClassName?: string;
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  caption?: string;
  className?: string;
};

/**
 * Dense, dark-mode table with a sticky header, hover-highlight rows, and an
 * optional onRowClick that promotes rows to a navigable list. Styling lives
 * in globals.css (.tbl / .tbl-clickable) so every table in the app shares
 * the exact same feel.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  empty,
  caption,
  className,
}: Props<T>) {
  const clickable = Boolean(onRowClick);
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      {caption ? (
        <div className="border-b border-border-subtle bg-bg-panel px-4 py-2 text-2xs text-fg-muted">
          {caption}
        </div>
      ) : null}

      <table className={cn("tbl", clickable && "tbl-clickable")}>
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border-subtle">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="hover:!bg-transparent">
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-fg-muted"
              >
                {empty ?? "No results"}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className="text-fg-primary"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      col.align === "right" && "text-right tabular-nums",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

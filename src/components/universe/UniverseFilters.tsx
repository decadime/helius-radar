"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Segment, TrackStatus } from "@/lib/enums";
import { cn } from "@/lib/cn";

const SEGMENT_OPTIONS = ["", ...Object.values(Segment)] as const;
const STATUS_OPTIONS = ["", ...Object.values(TrackStatus)] as const;

export function UniverseFilters({
  segment,
  status,
  competitorRpc,
  totalResults,
}: {
  segment: string | null;
  status: string | null;
  competitorRpc: boolean;
  totalResults: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const buildUrl = useCallback((next: URLSearchParams) => {
    const qs = next.toString();
    return qs ? `/universe?${qs}` : "/universe";
  }, []);

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      startTransition(() => router.replace(buildUrl(next)));
    },
    [buildUrl, params, router]
  );

  const toggleCompetitorRpc = () => {
    const next = new URLSearchParams(params.toString());
    if (competitorRpc) next.delete("rpc");
    else next.set("rpc", "competitor");
    startTransition(() => router.replace(buildUrl(next)));
  };

  const clear = () =>
    startTransition(() => router.replace("/universe"));

  const hasFilters = Boolean(segment || status || competitorRpc);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-bg-panel px-3 py-2">
      <Field label="Segment">
        <Select
          value={segment ?? ""}
          onChange={(v) => update("segment", v)}
          options={SEGMENT_OPTIONS}
          placeholder="All segments"
        />
      </Field>

      <div className="h-5 w-px bg-border-subtle" />

      <Field label="Track status">
        <Select
          value={status ?? ""}
          onChange={(v) => update("status", v)}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
        />
      </Field>

      <div className="h-5 w-px bg-border-subtle" />

      <button
        type="button"
        onClick={toggleCompetitorRpc}
        aria-pressed={competitorRpc}
        className={cn(
          "h-7 rounded-md border px-2.5 text-2xs font-medium uppercase tracking-[0.07em] transition-colors",
          competitorRpc
            ? "border-status-warn/50 bg-status-warn/10 text-status-warn"
            : "border-border-subtle bg-bg-raised text-fg-secondary hover:border-border-strong hover:text-fg-primary"
        )}
      >
        On competitor RPC
      </button>

      <div className="ml-auto flex items-center gap-3">
        <span
          className={cn(
            "text-2xs tabular-nums text-fg-muted",
            isPending && "opacity-60"
          )}
        >
          {totalResults.toLocaleString()} results
        </span>
        {hasFilters && (
          <button
            onClick={clear}
            className="h-7 rounded-md border border-border-subtle bg-bg-raised px-2.5 text-2xs text-fg-secondary hover:border-border-strong hover:text-fg-primary"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-2xs uppercase tracking-[0.08em] text-fg-muted">
      {label}
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 rounded-md border border-border-subtle bg-bg-raised px-2 pr-6 text-[12.5px] text-fg-primary outline-none hover:border-border-strong focus:border-accent"
    >
      {options.map((o) =>
        o === "" ? (
          <option key="__all" value="">
            {placeholder}
          </option>
        ) : (
          <option key={o} value={o}>
            {o}
          </option>
        )
      )}
    </select>
  );
}

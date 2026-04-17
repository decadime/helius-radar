"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";

export function TrackedFilters({
  q,
  wedge,
  wedgeOptions,
  totalResults,
}: {
  q: string | null;
  wedge: string | null;
  wedgeOptions: string[];
  totalResults: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [queryInput, setQueryInput] = useState(q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQueryInput(q ?? "");
  }, [q]);

  const buildUrl = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      return qs ? `/tracked?${qs}` : "/tracked";
    },
    []
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      startTransition(() => router.replace(buildUrl(next)));
    },
    [buildUrl, params, router]
  );

  const onSearchChange = (value: string) => {
    setQueryInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam("q", value.trim());
    }, 220);
  };

  const clear = () => {
    setQueryInput("");
    startTransition(() => router.replace("/tracked"));
  };

  const hasFilters = Boolean(q || wedge);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-bg-panel px-3 py-2">
      <div className="relative">
        <input
          value={queryInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search company…"
          className="h-7 w-[220px] rounded-md border border-border-subtle bg-bg-raised pl-7 pr-2 text-[12.5px] text-fg-primary placeholder:text-fg-muted outline-none hover:border-border-strong focus:border-accent"
        />
        <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
      </div>

      <div className="h-5 w-px bg-border-subtle" />

      <label className="flex items-center gap-2 text-2xs uppercase tracking-[0.08em] text-fg-muted">
        Wedge
        <select
          value={wedge ?? ""}
          onChange={(e) => updateParam("wedge", e.target.value)}
          className="h-7 rounded-md border border-border-subtle bg-bg-raised px-2 pr-6 text-[12.5px] text-fg-primary outline-none hover:border-border-strong focus:border-accent"
        >
          <option value="">All wedges</option>
          {wedgeOptions.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>

      <div className="ml-auto flex items-center gap-3">
        <span
          className={cn(
            "text-2xs tabular-nums text-fg-muted",
            isPending && "opacity-60"
          )}
        >
          {totalResults.toLocaleString()} tracked
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m13.5 13.5-3-3" strokeLinecap="round" />
    </svg>
  );
}

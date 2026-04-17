"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

export function DateSelector({
  value, // "YYYY-MM-DD"
  today, // "YYYY-MM-DD"
}: {
  value: string;
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const goTo = (iso: string) => {
    const url = iso === today ? "/targets" : `/targets?date=${iso}`;
    startTransition(() => router.replace(url));
  };

  const shift = (days: number) => {
    const [y, m, d] = value.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + days));
    const iso = next.toISOString().slice(0, 10);
    goTo(iso);
  };

  const isToday = value === today;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border-subtle bg-bg-panel p-0.5",
        isPending && "opacity-70"
      )}
    >
      <IconButton ariaLabel="Previous day" onClick={() => shift(-1)}>
        <ChevronLeft />
      </IconButton>

      <input
        type="date"
        value={value}
        onChange={(e) => {
          if (e.target.value) goTo(e.target.value);
        }}
        className="h-7 rounded-sm bg-transparent px-2 text-[12.5px] tabular-nums text-fg-primary outline-none [color-scheme:dark] focus:bg-bg-raised"
      />

      <IconButton ariaLabel="Next day" onClick={() => shift(1)}>
        <ChevronRight />
      </IconButton>

      <div className="mx-1 h-4 w-px bg-border-subtle" />

      <button
        onClick={() => goTo(today)}
        disabled={isToday}
        className={cn(
          "h-7 rounded-sm px-2.5 text-[12px] font-medium transition-colors",
          isToday
            ? "cursor-default text-fg-muted"
            : "text-fg-secondary hover:bg-bg-raised hover:text-fg-primary"
        )}
      >
        Today
      </button>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-secondary hover:bg-bg-raised hover:text-fg-primary"
    >
      {children}
    </button>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m10 3-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/universe": "Candidate Universe",
  "/tracked": "Tracked Accounts",
  "/targets": "Daily Targets",
  "/accounts": "Account Detail",
};

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/accounts/")) return "Account Detail";
  return TITLES[pathname] ?? "Helius Radar";
}

export function TopBar() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  const now = new Date();
  const stamp = now.toUTCString().replace("GMT", "UTC");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-6 border-b border-border-subtle bg-bg-base px-6">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-[15px] font-semibold text-fg-primary">
          {title}
        </h1>
        <span className="hidden text-fg-faint md:inline">/</span>
        <span className="hidden truncate text-[12px] text-fg-muted md:inline">
          production workspace · us-east
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search accounts, signals…"
            className="h-8 w-[280px] rounded-md border border-border-subtle bg-bg-panel pl-8 pr-10 text-[12.5px] text-fg-primary placeholder:text-fg-muted outline-none focus:border-border-strong focus:bg-bg-raised"
          />
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 kbd">⌘K</span>
        </div>

        <div className="hidden items-center gap-2 rounded-md border border-border-subtle bg-bg-panel px-2.5 py-1 text-2xs text-fg-secondary md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-status-ok shadow-[0_0_6px_theme(colors.status.ok)]" />
          <span className="font-mono tabular-nums">{stamp}</span>
        </div>

        <button className="flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-bg-panel px-3 text-[12.5px] text-fg-secondary hover:border-border-strong hover:text-fg-primary">
          <RefreshIcon className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
    </header>
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
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8a5 5 0 0 1 8.6-3.5" strokeLinecap="round" />
      <path d="M13 8a5 5 0 0 1-8.6 3.5" strokeLinecap="round" />
      <path d="M11 2.5v2.2H8.8M5 13.5v-2.2h2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

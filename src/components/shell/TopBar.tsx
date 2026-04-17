"use client";

import { useShell } from "./ShellContext";

export function TopBar() {
  const { toggleSidebar, sidebarOpen } = useShell();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-bg-base px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg-panel text-fg-secondary hover:border-border-strong hover:text-fg-primary lg:hidden"
        >
          <MenuIcon open={sidebarOpen} />
        </button>
        <span className="text-[14px] font-semibold tracking-tight text-fg-primary">
          Helius Radar
        </span>
        <StatusChip>Prototype</StatusChip>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border border-border-subtle bg-bg-panel px-2.5 py-1 text-2xs text-fg-secondary md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-status-ok shadow-[0_0_6px_theme(colors.status.ok)]" />
          <span className="font-mono tracking-tight">internal · us-east</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-panel px-2 py-1">
          <div className="grid h-5 w-5 place-items-center rounded-full border border-border-subtle bg-bg-raised text-[10px] font-semibold text-fg-secondary">
            O
          </div>
          <span className="hidden text-[12px] text-fg-secondary md:inline">
            Operator
          </span>
        </div>
      </div>
    </header>
  );
}

function StatusChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-status-warn/30 bg-status-warn/10 px-2 py-0.5 text-2xs font-medium uppercase tracking-[0.07em] text-status-warn">
      <span className="h-1 w-1 rounded-full bg-status-warn" />
      {children}
    </span>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5h10M3 8h10M3 11h10" strokeLinecap="round" />
    </svg>
  );
}

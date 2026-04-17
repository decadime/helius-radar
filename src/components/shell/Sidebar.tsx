"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useShell } from "./ShellContext";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const primary: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <IconDash /> },
  { href: "/universe", label: "Candidate Universe", icon: <IconUniverse /> },
  { href: "/tracked", label: "Tracked Accounts", icon: <IconTracked /> },
  { href: "/targets", label: "Daily Targets", icon: <IconTargets /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar } = useShell();

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[236px] shrink-0 flex-col border-r",
          "border-border-subtle bg-bg-panel transition-transform duration-200",
          "lg:static lg:z-auto lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Primary navigation"
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-border-subtle px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/30 bg-accent-subtle">
            <LogoMark />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[12.5px] font-semibold tracking-tight text-fg-primary">
              Radar
            </span>
            <span className="text-2xs text-fg-muted">GTM Intelligence</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <SectionLabel>Workspace</SectionLabel>
          <ul className="mt-1.5 space-y-0.5">
            {primary.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5",
                      "text-[13px] transition-colors",
                      active
                        ? "bg-bg-raised text-fg-primary"
                        : "text-fg-secondary hover:bg-bg-hover hover:text-fg-primary"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-accent" />
                    )}
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center transition-colors",
                        active
                          ? "text-accent"
                          : "text-fg-muted group-hover:text-fg-secondary"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border-subtle px-3 py-2.5 text-2xs text-fg-muted">
          <div className="flex items-center justify-between font-mono">
            <span>v0.1.0</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-status-ok shadow-[0_0_6px_theme(colors.status.ok)]" />
              local
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-2 pb-1 text-2xs font-medium uppercase tracking-[0.09em] text-fg-muted">
      {children}
    </div>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-accent" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconDash() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="2" width="5" height="6" rx="1" />
      <rect x="9" y="2" width="5" height="4" rx="1" />
      <rect x="2" y="10" width="5" height="4" rx="1" />
      <rect x="9" y="8" width="5" height="6" rx="1" />
    </svg>
  );
}
function IconUniverse() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6" />
      <ellipse cx="8" cy="8" rx="6" ry="2.5" />
      <ellipse cx="8" cy="8" rx="2.5" ry="6" />
    </svg>
  );
}
function IconTracked() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 8c2 0 2-3 4-3s2 3 4 3 2-3 4-3" />
      <circle cx="13" cy="12" r="1.5" />
    </svg>
  );
}
function IconTargets() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3.25" />
      <path d="M8 2v3M8 11v3M2 8h3M11 8h3" />
    </svg>
  );
}

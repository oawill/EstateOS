"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_ITEMS = [
  { href: "gate", label: "Gate" },
  { href: "gate/inside", label: "Inside" },
  { href: "gate", label: "Scan" },
  { href: "gate/incidents", label: "Incidents" },
] as const;

const MORE_ITEMS = [
  { href: "gate/walk-in", label: "Register Walk-In" },
  { href: "/account/security", label: "Account" },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  gate: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  "gate/inside": <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />,
  scan: <path d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2M20 8V6a2 2 0 00-2-2h-2M20 16v2a2 2 0 01-2 2h-2M7 12h10" strokeLinecap="round" strokeLinejoin="round" />,
  "gate/incidents": <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />,
};

/** Purpose-built security/gate bottom nav — Scan sits centered and visually prominent since it's the primary action a gate officer reaches for. Only rendered for SECURITY on small screens. */
export function SecurityMobileNav({ estateSlug }: { estateSlug: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setMoreOpen(false)} aria-hidden="true" />}
      {moreOpen && (
        <div className="fixed inset-x-0 bottom-16 z-50 rounded-t-2xl border-t border-border bg-surface p-2 shadow-lg sm:hidden">
          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href.startsWith("/") ? item.href : `/${estateSlug}/${item.href}`}
              onClick={() => setMoreOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Security">
        {PRIMARY_ITEMS.slice(0, 2).map((item) => {
          const fullHref = `/${estateSlug}/${item.href}`;
          const isActive = pathname === fullHref;
          return (
            <Link
              key={item.label}
              href={fullHref}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${isActive ? "text-primary" : "text-foreground-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                {ICONS[item.href]}
              </svg>
              {item.label}
            </Link>
          );
        })}

        <Link href={`/${estateSlug}/gate`} className="flex flex-1 flex-col items-center">
          <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              {ICONS.scan}
            </svg>
          </span>
          <span className="mt-0.5 text-xs font-medium text-primary">Scan</span>
        </Link>

        {PRIMARY_ITEMS.slice(3).map((item) => {
          const fullHref = `/${estateSlug}/${item.href}`;
          const isActive = pathname.startsWith(fullHref);
          return (
            <Link
              key={item.label}
              href={fullHref}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${isActive ? "text-primary" : "text-foreground-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                {ICONS[item.href]}
              </svg>
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${moreOpen ? "text-primary" : "text-foreground-muted"}`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {ICONS.more}
          </svg>
          More
        </button>
      </nav>
    </>
  );
}

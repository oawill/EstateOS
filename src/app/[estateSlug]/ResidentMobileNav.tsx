"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_ITEMS = [
  { href: "dashboard", label: "Home" },
  { href: "my/bills", label: "Payments" },
  { href: "visitors", label: "Visitors" },
  { href: "maintenance", label: "Maintenance" },
] as const;

const MORE_ITEMS = [
  { href: "community", label: "Community" },
  { href: "my/utilities", label: "Utilities" },
  { href: "notifications", label: "Notifications" },
  { href: "/account/security", label: "Account" },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  "my/bills": <path d="M3 8h18M3 8a2 2 0 012-2h14a2 2 0 012 2M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8M7 15h4" strokeLinecap="round" strokeLinejoin="round" />,
  visitors: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />,
  maintenance: <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4l-3-3z" strokeLinecap="round" strokeLinejoin="round" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />,
};

/**
 * Purpose-built resident bottom nav — not a shrunk-down version of
 * EstateNav's admin tab bar. Fixed to the viewport, large touch targets,
 * only the 4 highest-frequency resident actions plus a More sheet for
 * everything else. Only rendered for RESIDENT on small screens.
 */
export function ResidentMobileNav({ estateSlug }: { estateSlug: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setMoreOpen(false)} aria-hidden="true" />
      )}
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

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Resident"
      >
        {PRIMARY_ITEMS.map((item) => {
          const fullHref = `/${estateSlug}/${item.href}`;
          const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                isActive ? "text-primary" : "text-foreground-muted"
              }`}
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
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
            moreOpen ? "text-primary" : "text-foreground-muted"
          }`}
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

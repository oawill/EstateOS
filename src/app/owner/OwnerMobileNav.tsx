"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/owner", label: "Home", icon: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" /> },
  {
    href: "/owner/portfolio",
    label: "Portfolio",
    icon: <path d="M3 21V8l9-5 9 5v13M3 21h18M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: "/owner/reports",
    label: "Reports",
    icon: <path d="M9 17V9m3 8V5m3 12v-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: "/owner/more",
    label: "More",
    icon: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />,
  },
] as const;

/** Owner app's bottom nav — deliberately just 4 destinations (spec: "keep navigation simple"), same fixed/large-touch-target pattern as ResidentMobileNav. */
export function OwnerMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Owner"
    >
      {ITEMS.map((item) => {
        const isActive = item.href === "/owner" ? pathname === "/owner" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
              isActive ? "text-primary" : "text-foreground-muted"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

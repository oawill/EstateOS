"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "", label: "Today" },
  { href: "calendar", label: "Calendar" },
  { href: "reservations", label: "Reservations" },
  { href: "properties", label: "Properties" },
  { href: "guests", label: "Guests" },
  { href: "housekeeping", label: "Housekeeping" },
  { href: "maintenance", label: "Maintenance" },
];

export function ShortletNav({ estateSlug }: { estateSlug: string }) {
  const pathname = usePathname();
  const base = `/${estateSlug}/shortlet`;

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
      {NAV.map((item) => {
        const href = item.href ? `${base}/${item.href}` : base;
        const isActive = item.href ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={item.href}
            href={href}
            className={
              isActive
                ? "whitespace-nowrap rounded-lg border-b-2 border-primary-light px-3 py-1.5 text-sm font-medium text-white"
                : "whitespace-nowrap rounded-lg border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-navy-light hover:text-white"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

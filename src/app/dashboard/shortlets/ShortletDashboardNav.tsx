"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/shortlets", label: "Overview" },
  { href: "/dashboard/shortlets/calendar", label: "Calendar" },
  { href: "/dashboard/shortlets/bookings", label: "Bookings" },
  { href: "/dashboard/shortlets/listings", label: "Properties" },
  { href: "/dashboard/shortlets/revenue", label: "Revenue" },
];

export function ShortletDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
      {NAV.map((item) => {
        const isActive = item.href === "/dashboard/shortlets" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
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

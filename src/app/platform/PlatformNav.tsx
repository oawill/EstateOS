"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/platform", label: "Dashboard" },
  { href: "/platform/estates", label: "Estates" },
  { href: "/platform/plans", label: "Plans" },
  { href: "/platform/demo-requests", label: "Demo Requests" },
  { href: "/platform/users", label: "Users" },
  { href: "/platform/audit", label: "Audit" },
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
      {NAV.map((item) => {
        const isActive = item.href === "/platform" ? pathname === "/platform" : pathname.startsWith(item.href);
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

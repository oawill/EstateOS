"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/platform/tenant-management", label: "Overview" },
  { href: "/platform/tenant-management/landlords", label: "Landlords" },
  { href: "/platform/tenant-management/properties", label: "Properties" },
  { href: "/platform/tenant-management/tenants", label: "Tenants" },
  { href: "/platform/tenant-management/leases", label: "Leases" },
  { href: "/platform/tenant-management/payments", label: "Payments & Arrears" },
  { href: "/platform/tenant-management/maintenance", label: "Maintenance" },
  { href: "/platform/tenant-management/managers", label: "Managers" },
  { href: "/platform/tenant-management/statements", label: "Statements" },
];

export function TenantManagementNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-2">
      {NAV.map((item) => {
        const isActive = item.href === "/platform/tenant-management" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "whitespace-nowrap rounded-lg border-b-2 border-primary px-3 py-1.5 text-sm font-medium text-foreground"
                : "whitespace-nowrap rounded-lg border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

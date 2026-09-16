"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/tenants", label: "Overview" },
  { href: "/dashboard/tenants/properties", label: "Properties" },
  { href: "/dashboard/tenants/leasing", label: "Leasing" },
  { href: "/dashboard/tenants/tenants", label: "Tenants" },
  { href: "/dashboard/tenants/leases", label: "Leases" },
  { href: "/dashboard/tenants/payments", label: "Rent & Arrears" },
  { href: "/dashboard/tenants/maintenance", label: "Maintenance" },
  { href: "/dashboard/tenants/move-in", label: "Move-In" },
  { href: "/dashboard/tenants/move-out", label: "Move-Out" },
  { href: "/dashboard/tenants/inspections", label: "Inspections" },
  { href: "/dashboard/tenants/charges", label: "Charges" },
  { href: "/dashboard/tenants/settlements", label: "Settlements" },
  { href: "/dashboard/tenants/reminders", label: "Reminders" },
  { href: "/dashboard/tenants/reconciliation", label: "Reconciliation" },
];

export function TenantDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
      {NAV.map((item) => {
        const isActive = item.href === "/dashboard/tenants" ? pathname === item.href : pathname.startsWith(item.href);
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

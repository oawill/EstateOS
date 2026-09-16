import Link from "next/link";
import { Card, Button } from "@/components/shared/ui";
import { KpiCard } from "@/components/shared/KpiCard";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAccessibleContext } from "@/server/modules/tenantManagement/access";
import { getDashboardKpis } from "@/server/modules/tenantManagement/dashboard";
import { formatNaira, formatDate } from "@/lib/utils";
import { OwnerOnboardingForm } from "./OwnerOnboardingForm";
import { RentCollectedVsExpectedChart, OccupancyChart, LeaseExpirationsChart } from "./charts";

export default async function TenantManagementOverviewPage() {
  const ctx = await guardPage(async () => getAccessibleContext(await requireUser()));

  const hasAccess = ctx.isPlatformAdmin || ctx.ownerId !== null || ctx.managedPropertyIds.length > 0;
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Good day, {ctx.user.name.split(" ")[0]}</h1>
          <p className="text-sm text-foreground-muted">Welcome to NidraQ Tenant Management.</p>
        </div>
        <Card className="mx-auto max-w-lg">
          <h2 className="text-lg font-semibold tracking-tight">Set up your landlord profile</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Create your NidraQ Tenant Management landlord profile to start adding properties, units and tenants.
          </p>
          <div className="mt-4">
            <OwnerOnboardingForm defaultName={ctx.user.name} />
          </div>
        </Card>
      </div>
    );
  }

  const kpis = await getDashboardKpis(ctx.user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Good day, {ctx.user.name.split(" ")[0]}</h1>
        <p className="text-sm text-foreground-muted">Here&apos;s how your rental portfolio is doing.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Properties" value={kpis.totalProperties} />
        <KpiCard label="Rental units" value={kpis.totalUnits} />
        <KpiCard label="Occupied units" value={kpis.occupiedUnits} tone="success" />
        <KpiCard label="Vacant units" value={kpis.vacantUnits} tone="gray" />
        <KpiCard label="Occupancy rate" value={`${kpis.occupancyRate}%`} />
        <KpiCard label="Active tenants" value={kpis.activeTenants} />
        <KpiCard label="Active leases" value={kpis.activeLeases} />
        <KpiCard label="Leases expiring (90d)" value={kpis.leasesExpiring90} tone="warning" />
        <KpiCard label="Rent expected (month)" value={formatNaira(kpis.rentExpectedThisMonthMinor)} />
        <KpiCard label="Rent collected (month)" value={formatNaira(kpis.rentCollectedThisMonthMinor)} tone="success" />
        <KpiCard label="Outstanding rent" value={formatNaira(kpis.outstandingRentMinor)} tone="warning" />
        <KpiCard label="Overdue obligations" value={kpis.overdueObligationCount} tone="danger" />
        <KpiCard label="Open maintenance" value={kpis.openMaintenanceCount} tone="warning" />
        <KpiCard label="Collection rate (month)" value={`${kpis.collectionRate}%`} />
        <KpiCard label="Management fees earned" value={formatNaira(kpis.managementFeesEarnedMinor)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium">Rent Collected vs Expected</p>
          <RentCollectedVsExpectedChart expectedMinor={kpis.rentExpectedThisMonthMinor} collectedMinor={kpis.rentCollectedThisMonthMinor} />
        </Card>
        <Card className="flex flex-col items-center">
          <p className="self-start text-sm font-medium">Occupancy</p>
          <OccupancyChart occupied={kpis.occupiedUnits} vacant={kpis.vacantUnits} />
        </Card>
        <Card>
          <p className="text-sm font-medium">Lease Expirations</p>
          <LeaseExpirationsChart in30={kpis.leasesExpiring30} in60={kpis.leasesExpiring60} in90={kpis.leasesExpiring90} />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Recent Payments</p>
          <Link href="/dashboard/tenants/payments" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {kpis.recentPayments.length === 0 ? (
          <p className="mt-3 text-sm text-foreground-muted">No payments recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {kpis.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{p.tenant.fullName}</p>
                  <p className="text-xs text-foreground-muted">
                    {p.lease.unit.property.name} · {p.lease.unit.label} · {formatDate(p.paidAt)}
                  </p>
                </div>
                <p className="font-medium">{formatNaira(p.amountMinor)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link href="/dashboard/tenants/properties">
          <Button variant="secondary" className="w-full">
            Properties
          </Button>
        </Link>
        <Link href="/dashboard/tenants/tenants">
          <Button variant="secondary" className="w-full">
            Tenants
          </Button>
        </Link>
        <Link href="/dashboard/tenants/leases">
          <Button variant="secondary" className="w-full">
            Leases
          </Button>
        </Link>
        <Link href="/dashboard/tenants/payments">
          <Button variant="secondary" className="w-full">
            Rent &amp; Arrears
          </Button>
        </Link>
        <Link href="/dashboard/tenants/move-in">
          <Button variant="secondary" className="w-full">
            Move-In
          </Button>
        </Link>
        <Link href="/dashboard/tenants/move-out">
          <Button variant="secondary" className="w-full">
            Move-Out
          </Button>
        </Link>
        <Link href="/dashboard/tenants/charges">
          <Button variant="secondary" className="w-full">
            Charges
          </Button>
        </Link>
        <Link href="/dashboard/tenants/settlements">
          <Button variant="secondary" className="w-full">
            Settlements
          </Button>
        </Link>
      </div>
    </div>
  );
}

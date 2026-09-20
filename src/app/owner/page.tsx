import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { getDashboardKpis } from "@/server/modules/tenantManagement/dashboard";
import { listAccessibleProperties } from "@/server/modules/tenantManagement/property";
import { formatDate, formatNaira } from "@/lib/utils";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function OwnerHomePage() {
  const { user } = await guardPage(async () => requirePropertyOwner(await requireUser()));
  const [kpis, properties] = await Promise.all([getDashboardKpis(user), listAccessibleProperties(user)]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const attention: { key: string; title: string; where: string; detail: string; tone: "danger" | "warning"; href: string }[] = [];

  if (kpis.overdueObligationCount > 0) {
    attention.push({
      key: "overdue-rent",
      title: "Overdue rent",
      where: `${kpis.overdueObligationCount} tenant(s)`,
      detail: `${formatNaira(kpis.outstandingRentMinor)} outstanding`,
      tone: "danger",
      href: "/owner/portfolio",
    });
  }
  for (const lease of kpis.expiringLeases.in30) {
    attention.push({
      key: `lease-${lease.id}`,
      title: "Lease expiring",
      where: lease.unit.property.name,
      detail: `Expires in ${Math.max(daysUntil(lease.endDate), 0)} days`,
      tone: "warning",
      href: `/owner/properties/${lease.unit.propertyId}`,
    });
  }
  if (kpis.openMaintenanceCount > 0) {
    attention.push({
      key: "open-maintenance",
      title: "Open maintenance",
      where: `${kpis.openMaintenanceCount} request(s)`,
      detail: "Awaiting completion",
      tone: "warning",
      href: "/owner/portfolio",
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">Here&apos;s what needs your attention today.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Needs your attention</h2>
        {attention.length === 0 ? (
          <Card className="text-center">
            <p className="font-medium">Nothing needs your attention</p>
            <p className="mt-1 text-sm text-foreground-muted">You&apos;re up to date.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {attention.map((item) => (
              <Link key={item.key} href={item.href} className="block">
                <Card className="hover:border-slate-300">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-0.5 text-sm text-foreground-muted">
                        {item.where} · {item.detail}
                      </p>
                    </div>
                    <Badge tone={item.tone}>Review</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Financial snapshot · This month</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-foreground-muted">Rent collected</p>
            <p className="mt-1 text-xl font-semibold text-success">{formatNaira(kpis.rentCollectedThisMonthMinor)}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Outstanding</p>
            <p className="mt-1 text-xl font-semibold text-warning">{formatNaira(kpis.outstandingRentMinor)}</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Collection rate</p>
            <p className="mt-1 text-xl font-semibold">{kpis.collectionRate}%</p>
          </Card>
          <Card>
            <p className="text-xs text-foreground-muted">Occupancy</p>
            <p className="mt-1 text-xl font-semibold">
              {kpis.occupiedUnits}/{kpis.totalUnits}
            </p>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Properties</h2>
          <Link href="/owner/portfolio" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        {properties.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">
              Properties assigned to your NidraQ account will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {properties.slice(0, 3).map((property) => (
              <Link key={property.id} href={`/owner/properties/${property.id}`} className="block">
                <Card className="hover:border-slate-300">
                  <p className="font-medium">{property.name}</p>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {property.addressLine}, {property.city} · {property.units.length} unit(s)
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {kpis.recentPayments.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Recent money activity</h2>
          <div className="space-y-2">
            {kpis.recentPayments.map((payment) => (
              <Card key={payment.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-success">+{formatNaira(payment.amountMinor)}</p>
                  <p className="text-xs text-foreground-muted">
                    Rent received · {payment.lease.unit.property.name}
                  </p>
                </div>
                <p className="text-xs text-foreground-muted">{payment.paidAt ? formatDate(payment.paidAt) : ""}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

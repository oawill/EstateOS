import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { KpiCard } from "@/components/shared/KpiCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { getOrCreateShortletSettings } from "@/server/modules/shortlet/settings";
import { getShortletDashboardSummary } from "@/server/modules/shortlet/dashboard";
import { outstandingAmountMinor } from "@/server/modules/shortlet/reservations";

export default async function ShortletDashboardPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { summary, currency } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-reservations:*");
    const [summary, settings] = await Promise.all([
      getShortletDashboardSummary(membership.estateId),
      getOrCreateShortletSettings(membership.estateId),
    ]);
    return { summary, currency: settings.defaultCurrency };
  });

  const fmt = (minor: number) => formatCurrency(minor, currency);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Today</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Occupancy rate" value={`${summary.occupancyRate}%`} tone="success" />
        <KpiCard label="Available units" value={summary.availableUnits} tone="success" />
        <KpiCard label="Occupied units" value={summary.occupiedUnits} />
        <KpiCard label="Properties" value={summary.totalProperties} />
        <KpiCard label="Arrivals today" value={summary.arrivalsToday} tone="gray" />
        <KpiCard label="Departures today" value={summary.departuresToday} tone="gray" />
        <KpiCard label="Current guests" value={summary.currentGuests} />
        <KpiCard label="Not ready" value={summary.propertiesNotReady} tone={summary.propertiesNotReady > 0 ? "danger" : "neutral"} />
        <KpiCard label="Revenue today" value={fmt(summary.revenueTodayMinor)} tone="success" />
        <KpiCard label="Revenue this month" value={fmt(summary.revenueThisMonthMinor)} tone="success" />
        <KpiCard label="Outstanding balances" value={fmt(summary.outstandingTotalMinor)} tone={summary.outstandingTotalMinor > 0 ? "danger" : "neutral"} />
        <KpiCard label="Cleaning required" value={summary.cleaningRequiredCount} tone={summary.cleaningRequiredCount > 0 ? "warning" : "neutral"} />
        <KpiCard label="Maintenance issues" value={summary.maintenanceIssuesCount} tone={summary.maintenanceIssuesCount > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground-muted">Upcoming reservations</h2>
        {summary.upcomingReservations.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No upcoming reservations.</p>
          </Card>
        )}
        <div className="space-y-2">
          {summary.upcomingReservations.map((r) => (
            <Link key={r.id} href={`/${estateSlug}/shortlet/reservations/${r.id}`}>
              <Card className="py-3 transition-colors hover:bg-surface-muted">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {r.guest.fullName} · {r.unit.property.name} ({r.unit.unitLabel})
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                      {formatDate(r.checkInDate)} – {formatDate(r.checkOutDate)} · {r.reservationNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={r.status === "CONFIRMED" ? "success" : "neutral"}>{r.status}</Badge>
                    {outstandingAmountMinor(r) > 0 && (
                      <p className="mt-1 text-xs text-danger">{fmt(outstandingAmountMinor(r))} due</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

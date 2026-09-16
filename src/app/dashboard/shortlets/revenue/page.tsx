import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listAccessibleBookings } from "@/server/modules/shortletManagement/booking";
import { formatNaira } from "@/lib/utils";
import { MiniStat, SectionHeading, EmptyState, PropertyImage } from "../ui";

const REVENUE_STATUSES = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"];

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

export default async function ShortletRevenuePage() {
  const user = await guardPage(() => requireUser());
  const bookings = await listAccessibleBookings(user);
  const revenueBookings = bookings.filter((b) => REVENUE_STATUSES.includes(b.status));

  const now = new Date();
  const thisMonthKey = monthKey(now);
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthKey = monthKey(lastMonth);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const revenueThisMonth = revenueBookings.filter((b) => monthKey(b.checkInDate) === thisMonthKey).reduce((s, b) => s + b.totalAmountMinor, 0);
  const revenueLastMonth = revenueBookings.filter((b) => monthKey(b.checkInDate) === lastMonthKey).reduce((s, b) => s + b.totalAmountMinor, 0);
  const revenueYtd = revenueBookings.filter((b) => b.checkInDate >= yearStart).reduce((s, b) => s + b.totalAmountMinor, 0);

  const byProperty = new Map<string, { name: string; unit: string; image: string | null; totalMinor: number }>();
  for (const b of revenueBookings) {
    const key = b.listing.id;
    const entry = byProperty.get(key) ?? { name: b.listing.property.name, unit: b.listing.unit.label, image: b.listing.imageUrls[0] ?? null, totalMinor: 0 };
    entry.totalMinor += b.totalAmountMinor;
    byProperty.set(key, entry);
  }
  const propertyRows = Array.from(byProperty.values()).sort((a, b) => b.totalMinor - a.totalMinor);
  const maxPropertyRevenue = propertyRows[0]?.totalMinor ?? 0;

  const bySource = new Map<string, number>();
  for (const b of revenueBookings) {
    bySource.set(b.bookingSource, (bySource.get(b.bookingSource) ?? 0) + b.totalAmountMinor);
  }
  const sourceRows = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]);
  const totalSourceRevenue = sourceRows.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-6">
      <SectionHeading title="Revenue" />

      {revenueBookings.length === 0 ? (
        <EmptyState title="No revenue recorded yet." description="Once bookings start coming in, your revenue breakdown will appear here." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="Current Month" value={formatNaira(revenueThisMonth)} />
            <MiniStat label="Previous Month" value={formatNaira(revenueLastMonth)} />
            <MiniStat label="Year to Date" value={formatNaira(revenueYtd)} />
          </div>

          <div>
            <SectionHeading title="Revenue by Property" />
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              {propertyRows.map((p) => (
                <div key={`${p.name}-${p.unit}`} className="flex items-center gap-3">
                  <PropertyImage src={p.image} alt={p.name} className="h-10 w-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.name} · {p.unit}
                    </p>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${maxPropertyRevenue > 0 ? Math.max(4, (p.totalMinor / maxPropertyRevenue) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatNaira(p.totalMinor)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title="Booking Sources" />
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              {sourceRows.map(([source, amount]) => (
                <div key={source} className="flex items-center gap-3">
                  <p className="w-32 shrink-0 text-sm font-medium">{source.replaceAll("_", " ")}</p>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-info" style={{ width: `${totalSourceRevenue > 0 ? (amount / totalSourceRevenue) * 100 : 0}%` }} />
                  </div>
                  <p className="w-28 shrink-0 text-right text-sm font-semibold">{formatNaira(amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

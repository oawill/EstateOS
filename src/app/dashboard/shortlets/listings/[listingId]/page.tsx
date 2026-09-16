import Link from "next/link";
import { Card, Badge, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getListingDetail } from "@/server/modules/shortletManagement/listing";
import { listAvailabilityForListing } from "@/server/modules/shortletManagement/availability";
import { listBookingsForListing } from "@/server/modules/shortletManagement/booking";
import { formatNaira, formatDate } from "@/lib/utils";
import { deleteRatePlanAction, removeAvailabilityBlockAction } from "../../actions";
import { PropertyImage, StatusPill, GuestAvatar, MiniStat, EmptyState } from "../../ui";
import { RatePlanForm, AvailabilityBlockForm, OwnerStayForm } from "./ClientControls";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "calendar", label: "Calendar" },
  { key: "bookings", label: "Bookings" },
  { key: "financials", label: "Financials" },
  { key: "guests", label: "Guests" },
  { key: "settings", label: "Settings" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function ShortletListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await guardPage(() => requireUser());
  const { listingId } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = (TABS.find((t) => t.key === tabParam)?.key ?? "overview") as TabKey;

  const listing = await getListingDetail(user, listingId);
  const bookings = await listBookingsForListing(user, listingId);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const revenueCounting = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"];
  const monthBookings = bookings.filter(
    (b) => revenueCounting.includes(b.status) && b.checkInDate < nextMonthStart && b.checkOutDate > monthStart,
  );
  const revenueThisMonthMinor = monthBookings.reduce((sum, b) => sum + b.totalAmountMinor, 0);
  const nightsInMonth = Math.round((nextMonthStart.getTime() - monthStart.getTime()) / 86_400_000);
  const bookedNights = monthBookings.reduce((sum, b) => {
    const start = b.checkInDate > monthStart ? b.checkInDate : monthStart;
    const end = b.checkOutDate < nextMonthStart ? b.checkOutDate : nextMonthStart;
    return sum + Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  }, 0);
  const occupancyRate = listing.status === "ACTIVE" ? Math.round((bookedNights / nightsInMonth) * 100) : null;
  const upcomingGuest = bookings
    .filter((b) => ["CONFIRMED", "PENDING", "AWAITING_PAYMENT"].includes(b.status) && b.checkInDate >= now)
    .sort((a, b) => a.checkInDate.getTime() - b.checkInDate.getTime())[0];
  const currentGuest = bookings.find((b) => b.status === "CHECKED_IN");
  const nextDeparture = bookings
    .filter((b) => b.status === "CHECKED_IN")
    .sort((a, b) => a.checkOutDate.getTime() - b.checkOutDate.getTime())[0];

  const distinctGuests = Array.from(new Map(bookings.map((b) => [b.guest.id, b.guest])).values());

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/shortlets/listings" className="text-sm text-primary hover:underline">
          ← Properties
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <PropertyImage src={listing.imageUrls[0]} alt={listing.title} className="h-52 w-full sm:h-64" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">{listing.title}</h1>
              <p className="text-sm text-foreground-muted">
                {listing.property.name} · {listing.unit.label} · {listing.property.city}
              </p>
            </div>
            <StatusPill status={currentGuest ? "CHECKED_IN" : listing.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniStat label="Revenue This Month" value={formatNaira(revenueThisMonthMinor)} />
            <MiniStat label="Occupancy" value={occupancyRate !== null ? `${occupancyRate}%` : "—"} />
            <MiniStat label="Bookings" value={monthBookings.length} />
            <MiniStat label="Nightly Rate" value={formatNaira(listing.baseNightlyRateMinor)} />
            <MiniStat label="Available Nights" value={Math.max(nightsInMonth - bookedNights, 0)} />
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? `/dashboard/shortlets/listings/${listingId}` : `/dashboard/shortlets/listings/${listingId}?tab=${t.key}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold">Right Now</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex justify-between">
                <span className="text-foreground-muted">Currently</span>
                <span className="font-medium">{currentGuest ? `Guest Staying — ${currentGuest.guest.fullName}` : "Vacant"}</span>
              </p>
              {nextDeparture && (
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Guest checkout</span>
                  <span className="font-medium">{formatDate(nextDeparture.checkOutDate)}</span>
                </p>
              )}
              {upcomingGuest && (
                <p className="flex justify-between">
                  <span className="text-foreground-muted">Next booking</span>
                  <span className="font-medium">
                    {upcomingGuest.guest.fullName} · {formatDate(upcomingGuest.checkInDate)}
                  </span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="text-foreground-muted">Maintenance</span>
                <span className="font-medium text-foreground-muted">Not tracked yet</span>
              </p>
            </div>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold">About</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-foreground-muted">{listing.description}</p>
            {listing.amenities.length > 0 && <p className="mt-2 text-xs text-foreground-muted">{listing.amenities.join(" · ")}</p>}
          </Card>
        </div>
      )}

      {tab === "calendar" && (
        <Card>
          <h2 className="text-sm font-semibold">Next 90 Days</h2>
          <CalendarSection listingId={listingId} />
        </Card>
      )}

      {tab === "bookings" && (
        <div className="space-y-2">
          {bookings.length === 0 ? (
            <EmptyState title="No bookings yet." description="Bookings for this property will appear here once they come in." />
          ) : (
            bookings.map((b) => (
              <Link key={b.id} href={`/dashboard/shortlets/bookings/${b.id}`}>
                <Card className="flex items-center justify-between gap-3 hover:border-primary">
                  <div className="flex items-center gap-3">
                    <GuestAvatar name={b.guest.fullName} />
                    <div>
                      <p className="text-sm font-medium">{b.guest.fullName}</p>
                      <p className="text-xs text-foreground-muted">
                        {formatDate(b.checkInDate)} – {formatDate(b.checkOutDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={b.status} />
                    <p className="text-sm font-semibold">{formatNaira(b.totalAmountMinor)}</p>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "financials" && (
        <Card>
          <h2 className="text-sm font-semibold">This Month</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            <p className="flex justify-between">
              <span className="text-foreground-muted">Bookings</span>
              <span className="font-medium">{monthBookings.length}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-foreground-muted">Booked Nights</span>
              <span className="font-medium">{bookedNights}</span>
            </p>
            <p className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Gross Revenue</span>
              <span>{formatNaira(revenueThisMonthMinor)}</span>
            </p>
          </div>
        </Card>
      )}

      {tab === "guests" && (
        <div className="space-y-2">
          {distinctGuests.length === 0 ? (
            <EmptyState title="No guests yet." description="Guests who stay at this property will appear here." />
          ) : (
            distinctGuests.map((g) => (
              <Card key={g.id} className="flex items-center gap-3">
                <GuestAvatar name={g.fullName} />
                <div>
                  <p className="text-sm font-medium">{g.fullName}</p>
                  <p className="text-xs text-foreground-muted">{g.email || g.phone || "No contact info"}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold">Rate Plans</h2>
            <p className="mt-1 text-xs text-foreground-muted">
              Weekend/seasonal/date-specific rates layer on top of the base nightly rate. Past bookings keep whatever rate
              applied when they were made.
            </p>
            <div className="mt-2 space-y-1 text-sm">
              {listing.ratePlans.map((r) => (
                <p key={r.id} className="flex items-center justify-between">
                  <span>
                    {r.type} {r.label ? `— ${r.label}` : ""} · {formatNaira(r.nightlyRateMinor)}/night
                    {r.startDate && r.endDate ? ` · ${formatDate(r.startDate)} – ${formatDate(r.endDate)}` : ""}
                  </span>
                  <form action={deleteRatePlanAction.bind(null, r.id, listingId)}>
                    <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                      Delete
                    </Button>
                  </form>
                </p>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <RatePlanForm listingId={listingId} />
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Block Dates</h2>
            <div className="mt-3">
              <AvailabilityBlockForm listingId={listingId} />
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Owner Stay</h2>
            <p className="mt-1 text-xs text-foreground-muted">Blocks the calendar but is never counted as revenue or a guest booking.</p>
            <div className="mt-3">
              <OwnerStayForm listingId={listingId} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

async function CalendarSection({ listingId }: { listingId: string }) {
  const from = new Date();
  const to = new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);
  const { bookings, blocks, ownerStays } = await listAvailabilityForListing(listingId, from, to);

  if (bookings.length === 0 && blocks.length === 0 && ownerStays.length === 0) {
    return (
      <div className="mt-3">
        <EmptyState title="Wide open for the next 90 days." description="No bookings, blocks, or owner stays scheduled." />
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      {bookings.map((b) => (
        <p key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3">
          <span>
            <Badge tone="info">Booking</Badge> {b.guest.fullName} · {formatDate(b.checkInDate)} – {formatDate(b.checkOutDate)}
          </span>
          <StatusPill status={b.status} />
        </p>
      ))}
      {blocks.map((b) => (
        <p key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3">
          <span>
            <Badge tone="neutral">Blocked</Badge> {b.reason.replaceAll("_", " ")} · {formatDate(b.startDate)} – {formatDate(b.endDate)}
          </span>
          <form action={removeAvailabilityBlockAction.bind(null, b.id, listingId)}>
            <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
              Remove
            </Button>
          </form>
        </p>
      ))}
      {ownerStays.map((o) => (
        <p key={o.id} className="flex items-center justify-between rounded-lg border border-border p-3">
          <span>
            <Badge tone="warning">Owner Stay</Badge> {formatDate(o.startDate)} – {formatDate(o.endDate)}
          </span>
        </p>
      ))}
    </div>
  );
}

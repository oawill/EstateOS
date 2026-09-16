import { Card, Badge, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getListingDetail } from "@/server/modules/shortletManagement/listing";
import { listAvailabilityForListing } from "@/server/modules/shortletManagement/availability";
import { formatNaira, formatDate } from "@/lib/utils";
import { deleteRatePlanAction, removeAvailabilityBlockAction } from "../../actions";
import { RatePlanForm, AvailabilityBlockForm, OwnerStayForm } from "./ClientControls";

export default async function ShortletListingDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const user = await guardPage(() => requireUser());
  const { listingId } = await params;
  const listing = await getListingDetail(user, listingId);

  const from = new Date();
  const to = new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);
  const { bookings, blocks, ownerStays } = await listAvailabilityForListing(listingId, from, to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {listing.title} · {listing.listingReference}
        </h1>
        <p className="text-sm text-foreground-muted">
          {listing.property.name} · {listing.unit.label} · {formatNaira(listing.baseNightlyRateMinor)}/night
        </p>
        <Badge tone={listing.status === "ACTIVE" ? "success" : "warning"}>{listing.status}</Badge>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Next 90 days</h2>
        <div className="mt-2 space-y-1 text-sm">
          {bookings.length === 0 && blocks.length === 0 && ownerStays.length === 0 && (
            <p className="text-foreground-muted">Fully open — no bookings, blocks, or owner stays scheduled.</p>
          )}
          {bookings.map((b) => (
            <p key={b.id}>
              <Badge tone="info">Booking</Badge> {b.guest.fullName} · {formatDate(b.checkInDate)} – {formatDate(b.checkOutDate)} ({b.status})
            </p>
          ))}
          {blocks.map((b) => (
            <p key={b.id} className="flex items-center justify-between">
              <span>
                <Badge tone="neutral">Block</Badge> {b.reason} · {formatDate(b.startDate)} – {formatDate(b.endDate)}
              </span>
              <form action={removeAvailabilityBlockAction.bind(null, b.id, listingId)}>
                <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                  Remove
                </Button>
              </form>
            </p>
          ))}
          {ownerStays.map((o) => (
            <p key={o.id}>
              <Badge tone="warning">Owner Stay</Badge> {formatDate(o.startDate)} – {formatDate(o.endDate)}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Rate Plans</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          Weekend/seasonal/date-specific rates layer on top of the base nightly rate. Past bookings keep whatever rate applied
          when they were made.
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
        <h2 className="text-sm font-medium">Block Dates</h2>
        <div className="mt-3">
          <AvailabilityBlockForm listingId={listingId} />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Owner Stay</h2>
        <p className="mt-1 text-xs text-foreground-muted">Blocks the calendar but is never counted as revenue or a guest booking.</p>
        <div className="mt-3">
          <OwnerStayForm listingId={listingId} />
        </div>
      </Card>
    </div>
  );
}

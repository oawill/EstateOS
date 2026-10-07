import { Badge, Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { getEstateLocale } from "@/server/modules/estates/service";
import { listAmenities, listUpcomingBookings } from "@/server/modules/amenities/service";
import { AmenityForm } from "./AmenityForm";
import { toggleAmenityAction } from "./actions";

export default async function ManageAmenitiesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "estate:*"));

  const [amenities, bookings, locale] = await Promise.all([
    listAmenities(membership.estateId, { includeInactive: true }),
    listUpcomingBookings(membership.estateId),
    getEstateLocale(membership.estateId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Amenities</h1>
        <p className="mt-1 text-sm text-foreground-muted">Set up shared facilities residents can book. Opening hours are in the estate&apos;s local time.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium">Add a facility</h2>
        <AmenityForm estateSlug={estateSlug} />
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Facilities</h2>
        {amenities.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No facilities yet.</p>
          </Card>
        ) : (
          amenities.map((a) => (
            <Card key={a.id} className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{a.name}</p>
                  <Badge tone={a.isActive ? "success" : "neutral"}>{a.isActive ? "Active" : "Hidden"}</Badge>
                </div>
                <p className="text-xs text-foreground-muted">
                  {a.openTime}–{a.closeTime} · {a.slotMinutes}-min slots, up to {a.maxSlots} · {a.capacity} per slot
                </p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await toggleAmenityAction(estateSlug, a.id, !a.isActive);
                }}
              >
                <Button type="submit" variant="secondary">
                  {a.isActive ? "Hide" : "Show"}
                </Button>
              </form>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Upcoming bookings</h2>
        {bookings.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No upcoming bookings.</p>
          </Card>
        ) : (
          bookings.map((b) => (
            <Card key={b.id}>
              <p className="font-medium">{b.amenity.name}</p>
              <p className="text-sm text-foreground-muted">
                {b.resident.firstName} {b.resident.lastName} · {formatDateTime(b.startsAt, locale.timezone, locale.locale)}
              </p>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

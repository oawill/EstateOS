import { Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";
import { getEstateLocale } from "@/server/modules/estates/service";
import { listAmenities, listBookingsForResident } from "@/server/modules/amenities/service";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { BookingForm } from "./BookingForm";
import { cancelBookingAction } from "./actions";

export default async function AmenitiesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership, resident } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "own-amenities:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    return { membership, resident };
  });

  const [amenities, bookings, locale] = await Promise.all([
    listAmenities(membership.estateId),
    listBookingsForResident(membership.estateId, resident.id),
    getEstateLocale(membership.estateId),
  ]);
  const bookable = amenities.filter((a) => a.requiresBooking);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Amenities</h1>
        <p className="mt-1 text-sm text-foreground-muted">Shared facilities at your estate.</p>
      </div>

      {amenities.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">Your estate hasn&apos;t set up any amenities yet.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {amenities.map((a) => (
              <Card key={a.id}>
                <p className="font-medium">{a.name}</p>
                {a.description && <p className="mt-0.5 text-sm text-foreground-muted">{a.description}</p>}
                <p className="mt-1 text-xs text-foreground-muted">
                  {a.openTime}–{a.closeTime} · {a.requiresBooking ? "Booking required" : "No booking needed"}
                  {a.feeNote ? ` · ${a.feeNote}` : ""}
                </p>
              </Card>
            ))}
          </div>

          {bookable.length > 0 && (
            <Card>
              <h2 className="mb-3 font-medium">Make a booking</h2>
              <BookingForm
                estateSlug={estateSlug}
                amenities={bookable.map((a) => ({ id: a.id, name: a.name, openTime: a.openTime, closeTime: a.closeTime, slotMinutes: a.slotMinutes, maxSlots: a.maxSlots }))}
              />
            </Card>
          )}
        </>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Your upcoming bookings</h2>
        {bookings.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No upcoming bookings.</p>
          </Card>
        ) : (
          bookings.map((b) => (
            <Card key={b.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{b.amenity.name}</p>
                <p className="text-sm text-foreground-muted">
                  {formatDateTime(b.startsAt, locale.timezone, locale.locale)} – {formatDateTime(b.endsAt, locale.timezone, locale.locale)}
                </p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await cancelBookingAction(estateSlug, b.id);
                }}
              >
                <Button type="submit" variant="secondary">
                  Cancel
                </Button>
              </form>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

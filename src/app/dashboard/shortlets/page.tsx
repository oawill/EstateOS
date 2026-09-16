import Link from "next/link";
import { Card, Button, Input, Label } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getOwnOperatorProfile, listAssignedProperties, listUnlistedUnits } from "@/server/modules/shortletManagement/operator";
import { listAccessibleBookings } from "@/server/modules/shortletManagement/booking";
import { formatNaira, formatDate } from "@/lib/utils";
import { createOperatorProfileAction } from "./actions";

export default async function ShortletOverviewPage() {
  const user = await guardPage(() => requireUser());
  const operator = await getOwnOperatorProfile(user.id);

  if (!operator) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-xl font-semibold">Set up your Shortlet Operator profile</h1>
        <p className="text-sm text-foreground-muted">
          Create your operator profile to start managing shortlet properties, listings, and bookings. A property owner can then
          grant you access to a specific property from their Tenant Management dashboard.
        </p>
        <Card>
          <OperatorSetupForm />
        </Card>
      </div>
    );
  }

  const [assignedProperties, unlistedUnits, bookings] = await Promise.all([
    listAssignedProperties(user),
    listUnlistedUnits(user),
    listAccessibleBookings(user),
  ]);

  const upcoming = bookings.filter((b) => ["CONFIRMED", "CHECKED_IN"].includes(b.status)).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{operator.name}</h1>

      <Card>
        <h2 className="text-sm font-medium">Getting access to a property</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          A property owner grants shortlet access from their own Tenant Management property page — share your operator account
          email (<strong>{user.email}</strong>) with the owner and ask them to assign it there.
        </p>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Assigned Properties</h2>
        <div className="mt-3 space-y-2">
          {assignedProperties.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">
                No properties assigned yet. Ask a property owner to assign you from their Tenant Management dashboard.
              </p>
            </Card>
          )}
          {assignedProperties.map((property) => (
            <Card key={property.id}>
              <p className="font-medium">{property.name}</p>
              <p className="text-sm text-foreground-muted">
                {property.city} · {property.units.length} unit(s)
              </p>
            </Card>
          ))}
        </div>
      </div>

      {unlistedUnits.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Units Eligible for a Shortlet Listing</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {unlistedUnits.map((unit) => (
              <Card key={unit.id}>
                <p className="font-medium">
                  {unit.property.name} · {unit.label}
                </p>
                <Link href={`/dashboard/shortlets/listings/new?unitId=${unit.id}`}>
                  <Button variant="secondary" className="mt-2">
                    Create Listing
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Upcoming Bookings</h2>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No upcoming confirmed bookings.</p>
            </Card>
          )}
          {upcoming.map((booking) => (
            <Link key={booking.id} href={`/dashboard/shortlets/bookings/${booking.id}`}>
              <Card className="cursor-pointer hover:border-primary">
                <p className="font-medium">
                  {booking.guest.fullName} · {booking.listing.unit.label}
                </p>
                <p className="text-sm text-foreground-muted">
                  {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)} · {formatNaira(booking.totalAmountMinor)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/shortlets/listings">
          <Button variant="secondary">View All Listings</Button>
        </Link>
        <Link href="/dashboard/shortlets/bookings">
          <Button variant="secondary">View All Bookings</Button>
        </Link>
      </div>
    </div>
  );
}

function OperatorSetupForm() {
  return (
    <form action={createOperatorProfileAction as never} className="space-y-3">
      <div>
        <Label htmlFor="op-name">Business / operator name</Label>
        <Input id="op-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="op-email">Contact email</Label>
        <Input id="op-email" name="contactEmail" type="email" />
      </div>
      <div>
        <Label htmlFor="op-phone">Contact phone</Label>
        <Input id="op-phone" name="contactPhone" />
      </div>
      <Button type="submit">Create Operator Profile</Button>
    </form>
  );
}


import Link from "next/link";
import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listAccessibleBookings } from "@/server/modules/shortletManagement/booking";
import { listAccessibleListings } from "@/server/modules/shortletManagement/listing";
import { formatNaira, formatDate } from "@/lib/utils";
import { NewDirectBookingForm } from "./ClientControls";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  INQUIRY: "neutral",
  PENDING: "warning",
  AWAITING_PAYMENT: "warning",
  CONFIRMED: "info",
  CHECKED_IN: "success",
  CHECKED_OUT: "neutral",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
};

export default async function ShortletBookingsPage() {
  const user = await guardPage(() => requireUser());
  const [bookings, listings] = await Promise.all([listAccessibleBookings(user), listAccessibleListings(user)]);
  const activeListings = listings.filter((l) => l.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Bookings</h1>

      <Card>
        <h2 className="text-sm font-medium">Create a direct booking</h2>
        <p className="mt-1 text-xs text-foreground-muted">For phone, WhatsApp, walk-in, or other direct bookings.</p>
        <div className="mt-3">
          <NewDirectBookingForm listings={activeListings.map((l) => ({ id: l.id, label: `${l.property.name} · ${l.unit.label}` }))} />
        </div>
      </Card>

      <div className="space-y-2">
        {bookings.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No bookings yet.</p>
          </Card>
        )}
        {bookings.map((booking) => (
          <Link key={booking.id} href={`/dashboard/shortlets/bookings/${booking.id}`}>
            <Card className="cursor-pointer hover:border-primary">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {booking.guest.fullName} · {booking.bookingReference}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {booking.listing.property.name} · {booking.listing.unit.label} · {formatDate(booking.checkInDate)} –{" "}
                    {formatDate(booking.checkOutDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[booking.status] ?? "neutral"}>{booking.status.replaceAll("_", " ")}</Badge>
                  <p className="font-semibold">{formatNaira(booking.totalAmountMinor)}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

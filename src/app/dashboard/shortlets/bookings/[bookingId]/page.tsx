import { Card, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getBookingDetail } from "@/server/modules/shortletManagement/booking";
import { formatNaira, formatDate } from "@/lib/utils";
import { checkInBookingAction, checkOutBookingAction } from "../../actions";
import { StatusPill, GuestAvatar, PropertyImage, BookingJourney } from "../../ui";
import { RecordPaymentForm, CancelBookingForm } from "./ClientControls";

export default async function ShortletBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const user = await guardPage(() => requireUser());
  const { bookingId } = await params;
  const booking = await getBookingDetail(user, bookingId);

  const outstandingMinor = booking.totalAmountMinor - booking.amountPaidMinor;
  const isPaid = booking.amountPaidMinor >= booking.totalAmountMinor;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row">
          <PropertyImage src={booking.listing.imageUrls[0]} alt={booking.listing.title} className="h-40 w-full sm:h-auto sm:w-56" />
          <div className="flex-1 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Booking {booking.bookingReference}</p>
            <div className="mt-1 flex items-center gap-3">
              <GuestAvatar name={booking.guest.fullName} />
              <div>
                <h1 className="text-lg font-semibold">{booking.guest.fullName}</h1>
                <p className="text-sm text-foreground-muted">
                  {booking.listing.property.name} · {booking.listing.unit.label}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-foreground-muted">Arrival</p>
                <p className="font-medium">{formatDate(booking.checkInDate)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Departure</p>
                <p className="font-medium">{formatDate(booking.checkOutDate)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Nights</p>
                <p className="font-medium">{booking.nights}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Guests</p>
                <p className="font-medium">{booking.numberOfGuests}</p>
              </div>
            </div>
            <div className="mt-4">
              <StatusPill status={booking.status} />
              <span className="ml-2 text-xs text-foreground-muted">Source: {booking.bookingSource.replaceAll("_", " ")}</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="text-sm font-semibold">Booking Journey</h2>
        <div className="mt-3">
          <BookingJourney status={booking.status} isPaid={isPaid} />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Financial Summary</h2>
        <div className="mt-3 space-y-1.5 text-sm">
          {booking.charges.map((c) => (
            <p key={c.id} className="flex justify-between text-foreground-muted">
              <span>{c.description}</span>
              <span className="text-foreground">
                {c.type === "DISCOUNT" ? "-" : ""}
                {formatNaira(c.amountMinor)}
              </span>
            </p>
          ))}
          <p className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total stay charges</span>
            <span>{formatNaira(booking.totalAmountMinor)}</span>
          </p>
          <p className="flex justify-between text-foreground-muted">
            <span>Security deposit (refundable, not revenue)</span>
            <span>{formatNaira(booking.securityDepositMinor)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-foreground-muted">Paid</span>
            <span className="font-medium text-success">{formatNaira(booking.amountPaidMinor)}</span>
          </p>
          <p className="flex justify-between text-base font-semibold">
            <span>Outstanding</span>
            <span className={outstandingMinor > 0 ? "text-danger" : "text-success"}>{formatNaira(Math.max(outstandingMinor, 0))}</span>
          </p>
        </div>

        {booking.payments.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Payment History</p>
            {booking.payments.map((p) => (
              <p key={p.id} className="flex justify-between text-foreground-muted">
                <span>
                  {p.method.replaceAll("_", " ")} · {formatDate(p.paidAt)}
                </span>
                <span className="text-foreground">{formatNaira(p.amountMinor)}</span>
              </p>
            ))}
          </div>
        )}

        {!["CANCELLED", "NO_SHOW"].includes(booking.status) && (
          <div className="mt-4 border-t border-border pt-4">
            <RecordPaymentForm bookingId={booking.id} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Stay Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {booking.status === "CONFIRMED" && (
            <form action={checkInBookingAction.bind(null, booking.id)}>
              <Button type="submit">Check In Guest</Button>
            </form>
          )}
          {booking.status === "CHECKED_IN" && (
            <form action={checkOutBookingAction.bind(null, booking.id)}>
              <Button type="submit">Check Out Guest</Button>
            </form>
          )}
          {!["CHECKED_OUT", "COMPLETED", "CANCELLED"].includes(booking.status) && <CancelBookingForm bookingId={booking.id} />}
        </div>
      </Card>
    </div>
  );
}

import { Card, Badge, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getBookingDetail } from "@/server/modules/shortletManagement/booking";
import { formatNaira, formatDate } from "@/lib/utils";
import { checkInBookingAction, checkOutBookingAction } from "../../actions";
import { RecordPaymentForm, CancelBookingForm } from "./ClientControls";

export default async function ShortletBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const user = await guardPage(() => requireUser());
  const { bookingId } = await params;
  const booking = await getBookingDetail(user, bookingId);

  const outstandingMinor = booking.totalAmountMinor - booking.amountPaidMinor;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {booking.guest.fullName} · {booking.bookingReference}
        </h1>
        <p className="text-sm text-foreground-muted">
          {booking.listing.property.name} · {booking.listing.unit.label} · {formatDate(booking.checkInDate)} –{" "}
          {formatDate(booking.checkOutDate)} · {booking.numberOfGuests} guest(s)
        </p>
        <Badge tone="info">{booking.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Financial Record</h2>
        <div className="mt-2 space-y-1 text-sm">
          {booking.charges.map((c) => (
            <p key={c.id} className="flex justify-between">
              <span>{c.description}</span>
              <span>{c.type === "DISCOUNT" ? "-" : ""}{formatNaira(c.amountMinor)}</span>
            </p>
          ))}
          <p className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total stay charges</span>
            <span>{formatNaira(booking.totalAmountMinor)}</span>
          </p>
          <p className="flex justify-between text-foreground-muted">
            <span>Security deposit (refundable, not revenue)</span>
            <span>{formatNaira(booking.securityDepositMinor)}</span>
          </p>
          <p className="flex justify-between">
            <span>Paid</span>
            <span>{formatNaira(booking.amountPaidMinor)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Outstanding</span>
            <span className={outstandingMinor > 0 ? "text-danger" : "text-success"}>{formatNaira(Math.max(outstandingMinor, 0))}</span>
          </p>
        </div>

        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Payments</p>
          {booking.payments.length === 0 && <p className="text-foreground-muted">No payments recorded yet.</p>}
          {booking.payments.map((p) => (
            <p key={p.id} className="flex justify-between">
              <span>
                {p.method.replaceAll("_", " ")} · {formatDate(p.paidAt)}
              </span>
              <span>{formatNaira(p.amountMinor)}</span>
            </p>
          ))}
        </div>

        {!["CANCELLED", "NO_SHOW"].includes(booking.status) && (
          <div className="mt-3 border-t border-border pt-3">
            <RecordPaymentForm bookingId={booking.id} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Stay Actions</h2>
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

import Link from "next/link";
import { ReservationStatus } from "@prisma/client";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { getOrCreateShortletSettings } from "@/server/modules/shortlet/settings";
import { getReservation, outstandingAmountMinor } from "@/server/modules/shortlet/reservations";
import { updateReservationStatusAction } from "../actions";

const STATUS_TONE = {
  INQUIRY: "neutral",
  PENDING: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "info",
  CHECKED_OUT: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "danger",
} as const;

const NEXT_ACTIONS: Record<ReservationStatus, { status: ReservationStatus; label: string; variant?: "primary" | "secondary" | "danger" }[]> = {
  INQUIRY: [
    { status: ReservationStatus.PENDING, label: "Move to Pending" },
    { status: ReservationStatus.CANCELLED, label: "Cancel", variant: "danger" },
  ],
  PENDING: [
    { status: ReservationStatus.CONFIRMED, label: "Confirm" },
    { status: ReservationStatus.CANCELLED, label: "Cancel", variant: "danger" },
  ],
  CONFIRMED: [
    { status: ReservationStatus.CHECKED_IN, label: "Check In" },
    { status: ReservationStatus.NO_SHOW, label: "No Show", variant: "danger" },
    { status: ReservationStatus.CANCELLED, label: "Cancel", variant: "danger" },
  ],
  CHECKED_IN: [{ status: ReservationStatus.CHECKED_OUT, label: "Check Out" }],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const CHARGE_LINES: [string, (r: { taxesMinor: number; cleaningFeeMinor: number; securityDepositMinor: number; discountMinor: number; additionalFeesMinor: number }) => number][] = [
  ["Taxes", (r) => r.taxesMinor],
  ["Cleaning fee", (r) => r.cleaningFeeMinor],
  ["Security deposit", (r) => r.securityDepositMinor],
  ["Additional fees", (r) => r.additionalFeesMinor],
  ["Discount", (r) => -r.discountMinor],
];

export default async function ShortletReservationDetailPage({
  params,
}: {
  params: Promise<{ estateSlug: string; reservationId: string }>;
}) {
  const { estateSlug, reservationId } = await params;
  const { reservation, currency } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-reservations:*");
    const [reservation, settings] = await Promise.all([
      getReservation(membership.estateId, reservationId),
      getOrCreateShortletSettings(membership.estateId),
    ]);
    return { reservation, currency: reservation.unit.property.currency ?? settings.defaultCurrency };
  });

  const fmt = (minor: number) => formatCurrency(minor, currency);
  const outstanding = outstandingAmountMinor(reservation);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{reservation.reservationNumber}</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">
            <Link href={`/${estateSlug}/shortlet/guests/${reservation.guestId}`} className="hover:underline">
              {reservation.guest.fullName}
            </Link>{" "}
            · {reservation.unit.property.name} ({reservation.unit.unitLabel})
          </p>
        </div>
        <Badge tone={STATUS_TONE[reservation.status]}>{reservation.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-foreground-muted">Check-in</p>
            <p className="font-medium">{formatDate(reservation.checkInDate)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Check-out</p>
            <p className="font-medium">{formatDate(reservation.checkOutDate)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Nights</p>
            <p className="font-medium">{reservation.nights}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Guests</p>
            <p className="font-medium">{reservation.numberOfGuests}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Booking source</p>
            <p className="font-medium">{reservation.bookingSource.replaceAll("_", " ")}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-medium text-foreground-muted">Charges</p>
        <div className="flex justify-between text-sm">
          <span>
            {fmt(reservation.nightlyRateMinor)} × {reservation.nights} night{reservation.nights === 1 ? "" : "s"}
          </span>
          <span>{fmt(reservation.nightlyRateMinor * reservation.nights)}</span>
        </div>
        {CHARGE_LINES.map(([label, get]) => {
          const amount = get(reservation);
          if (amount === 0) return null;
          return (
            <div key={label} className="flex justify-between text-sm">
              <span>{label}</span>
              <span>{fmt(amount)}</span>
            </div>
          );
        })}
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{fmt(reservation.totalAmountMinor)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground-muted">Paid</span>
          <span>{fmt(reservation.amountPaidMinor)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className={outstanding > 0 ? "text-danger" : ""}>Outstanding</span>
          <span className={outstanding > 0 ? "text-danger" : ""}>{fmt(outstanding)}</span>
        </div>
        <p className="pt-1 text-xs text-foreground-muted">
          Payments aren&apos;t wired up yet — amount paid is a placeholder until Phase 2.
        </p>
      </Card>

      {reservation.notes && (
        <Card>
          <p className="text-sm font-medium text-foreground-muted">Notes</p>
          <p className="mt-1 text-sm">{reservation.notes}</p>
        </Card>
      )}

      {NEXT_ACTIONS[reservation.status].length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-medium text-foreground-muted">Actions</p>
          <div className="flex flex-wrap gap-2">
            {NEXT_ACTIONS[reservation.status].map((action) => (
              <form key={action.status} action={updateReservationStatusAction.bind(null, estateSlug, reservationId)}>
                <input type="hidden" name="status" value={action.status} />
                <Button type="submit" variant={action.variant ?? "primary"}>
                  {action.label}
                </Button>
              </form>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

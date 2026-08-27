import Link from "next/link";
import { ReservationStatus } from "@prisma/client";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { getOrCreateShortletSettings } from "@/server/modules/shortlet/settings";
import { listReservations } from "@/server/modules/shortlet/reservations";

const STATUS_TONE = {
  INQUIRY: "neutral",
  PENDING: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "info",
  CHECKED_OUT: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "danger",
} as const;

export default async function ShortletReservationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { estateSlug } = await params;
  const { status } = await searchParams;
  const statusFilter = status && status in ReservationStatus ? (status as ReservationStatus) : undefined;

  const { reservations, currency } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-reservations:*");
    const [reservations, settings] = await Promise.all([
      listReservations(membership.estateId, { status: statusFilter }),
      getOrCreateShortletSettings(membership.estateId),
    ]);
    return { reservations, currency: settings.defaultCurrency };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reservations</h1>
        <Link href={`/${estateSlug}/shortlet/reservations/new`}>
          <Button type="button">New reservation</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={`/${estateSlug}/shortlet/reservations`}
          className={!statusFilter ? "rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" : "rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground-muted"}
        >
          All
        </Link>
        {Object.values(ReservationStatus).map((s) => (
          <Link
            key={s}
            href={`/${estateSlug}/shortlet/reservations?status=${s}`}
            className={statusFilter === s ? "rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" : "rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground-muted"}
          >
            {s.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      {reservations.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">No reservations found.</p>
        </Card>
      )}

      <div className="space-y-2">
        {reservations.map((r) => (
          <Link key={r.id} href={`/${estateSlug}/shortlet/reservations/${r.id}`}>
            <Card className="py-3 transition-colors hover:bg-surface-muted">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {r.guest.fullName} · {r.unit.property.name} ({r.unit.unitLabel})
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {formatDate(r.checkInDate)} – {formatDate(r.checkOutDate)} · {r.reservationNumber} ·{" "}
                    {r.bookingSource.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status.replaceAll("_", " ")}</Badge>
                  <p className="mt-1 text-xs text-foreground-muted">{formatCurrency(r.totalAmountMinor, currency)}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

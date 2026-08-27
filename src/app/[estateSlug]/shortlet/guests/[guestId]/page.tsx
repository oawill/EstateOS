import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { getGuest } from "@/server/modules/shortlet/guests";
import { getOrCreateShortletSettings } from "@/server/modules/shortlet/settings";
import { GuestForm } from "../GuestForm";

export default async function ShortletGuestDetailPage({
  params,
}: {
  params: Promise<{ estateSlug: string; guestId: string }>;
}) {
  const { estateSlug, guestId } = await params;
  const { guest, currency } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-guests:*");
    const [guest, settings] = await Promise.all([
      getGuest(membership.estateId, guestId),
      getOrCreateShortletSettings(membership.estateId),
    ]);
    return { guest, currency: settings.defaultCurrency };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{guest.fullName}</h1>

      <GuestForm
        estateSlug={estateSlug}
        guestId={guest.id}
        defaults={{
          fullName: guest.fullName,
          phone: guest.phone,
          email: guest.email,
          country: guest.country,
          emergencyContactName: guest.emergencyContactName,
          emergencyContactPhone: guest.emergencyContactPhone,
          vehicleDetails: guest.vehicleDetails,
          idType: guest.idType,
          idNumber: guest.idNumber,
          notes: guest.notes,
          preferences: guest.preferences,
        }}
      />

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground-muted">Stay history ({guest.reservations.length})</h2>
        {guest.reservations.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No stays yet.</p>
          </Card>
        )}
        <div className="space-y-2">
          {guest.reservations.map((r) => (
            <Link key={r.id} href={`/${estateSlug}/shortlet/reservations/${r.id}`}>
              <Card className="py-3 transition-colors hover:bg-surface-muted">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {r.unit.property.name} ({r.unit.unitLabel})
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                      {formatDate(r.checkInDate)} – {formatDate(r.checkOutDate)} · {r.reservationNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge>{r.status}</Badge>
                    <p className="mt-1 text-xs text-foreground-muted">{formatCurrency(r.totalAmountMinor, currency)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

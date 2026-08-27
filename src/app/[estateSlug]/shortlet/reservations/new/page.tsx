import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listProperties } from "@/server/modules/shortlet/properties";
import { listGuests } from "@/server/modules/shortlet/guests";
import { NewReservationForm } from "../NewReservationForm";

export default async function NewReservationPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { units, guests } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-reservations:*");
    const [properties, guests] = await Promise.all([
      listProperties(membership.estateId),
      listGuests(membership.estateId),
    ]);
    const units = properties.flatMap((property) =>
      property.units.map((unit) => ({
        id: unit.id,
        unitLabel: unit.unitLabel,
        propertyName: property.name,
        baseNightlyRateMinor: property.baseNightlyRateMinor,
      })),
    );
    return { units, guests };
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">New reservation</h1>
      <NewReservationForm estateSlug={estateSlug} units={units} guests={guests} />
    </div>
  );
}

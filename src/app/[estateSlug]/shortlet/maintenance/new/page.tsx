import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listProperties } from "@/server/modules/shortlet/properties";
import { NewShortletTicketForm } from "./NewShortletTicketForm";

export default async function NewShortletMaintenanceTicketPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const units = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-maintenance:*");
    const properties = await listProperties(membership.estateId);
    return properties.flatMap((property) =>
      property.units.map((unit) => ({ id: unit.id, unitLabel: unit.unitLabel, propertyName: property.name })),
    );
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Report a maintenance issue</h1>
      <NewShortletTicketForm estateSlug={estateSlug} units={units} />
    </div>
  );
}

import { Prisma } from "@prisma/client";
import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { scoped } from "@/server/db/scoped";
import { NewResidentForm } from "../NewResidentForm";

const unitWithProperty = Prisma.validator<Prisma.UnitDefaultArgs>()({ include: { property: true } });
type UnitWithProperty = Prisma.UnitGetPayload<typeof unitWithProperty>;

export default async function NewResidentPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "residents:*"));

  const units = await scoped(membership.estateId).unit.findMany<UnitWithProperty>({
    orderBy: { label: "asc" },
    include: unitWithProperty.include,
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Add resident</h1>
      <Card>
        <NewResidentForm
          estateSlug={estateSlug}
          units={units.map((u) => ({
            id: u.id,
            label: u.label,
            propertyAddressLabel: u.property.addressLabel,
          }))}
        />
      </Card>
    </div>
  );
}

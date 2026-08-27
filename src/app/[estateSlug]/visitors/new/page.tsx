import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { scoped } from "@/server/db/scoped";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { NewVisitorForm } from "../NewVisitorForm";

export default async function NewVisitorPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const { registeredVehicles } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "own-visitors:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const vehicles = await scoped(membership.estateId).vehicle.findMany({ where: { residentId: resident.id } as never });
    return { registeredVehicles: vehicles.map((v) => v.plateNumber) };
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Request Gate Pass</h1>
      <Card>
        <NewVisitorForm estateSlug={estateSlug} registeredVehicles={registeredVehicles} />
      </Card>
    </div>
  );
}

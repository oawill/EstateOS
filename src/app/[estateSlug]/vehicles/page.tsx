import { Card, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId, listVehiclesForResident } from "@/server/modules/residents/service";
import { VehicleForm } from "./VehicleForm";
import { removeVehicleAction } from "./actions";

export default async function VehiclesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstatePermission(estateSlug, "own-vehicles:*"));
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const vehicles = await listVehiclesForResident(membership.estateId, resident.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">My Vehicles</h1>
      <p className="text-sm text-foreground-muted">
        Vehicles registered here help security recognize and authorize your access at the gate.
      </p>

      <Card>
        <h2 className="text-sm font-medium">Add a vehicle</h2>
        <div className="mt-3">
          <VehicleForm estateSlug={estateSlug} />
        </div>
      </Card>

      <div className="space-y-3">
        {vehicles.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No vehicles on file yet. Add one above.</p>
          </Card>
        ) : (
          vehicles.map((v) => (
            <Card key={v.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{v.plateNumber}</p>
                <p className="text-sm text-foreground-muted">{[v.color, v.make, v.model].filter(Boolean).join(" · ") || "No details added"}</p>
              </div>
              <form action={removeVehicleAction.bind(null, estateSlug, v.id)}>
                <Button type="submit" variant="danger" className="px-3 py-1.5 text-xs">
                  Remove
                </Button>
              </form>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

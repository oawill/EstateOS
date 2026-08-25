import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listResidents } from "@/server/modules/residents/service";
import { moveOutResidentAction } from "./actions";

export default async function ResidentsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "residents:*"));
  const residents = await listResidents(membership.estateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Residents</h1>
        <Link href={`/${estateSlug}/residents/new`}>
          <Button>Add resident</Button>
        </Link>
      </div>

      {residents.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No residents yet. Add a property first, then add its residents.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {residents.map((resident) => {
            const occupancy = resident.occupancies[0];
            return (
              <Card key={resident.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {resident.firstName} {resident.lastName}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {resident.email || resident.phone || "No contact on file"}
                    </p>
                    {occupancy && (
                      <p className="mt-1 text-sm text-slate-500">
                        {occupancy.unit.property.addressLabel}
                        {occupancy.unit.label ? ` · Unit ${occupancy.unit.label}` : ""} ·{" "}
                        {occupancy.role.replaceAll("_", " ")}
                      </p>
                    )}
                    {resident.vehicles.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        Vehicles: {resident.vehicles.map((v) => v.plateNumber).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {occupancy ? <Badge tone="success">Current</Badge> : <Badge>Moved out</Badge>}
                    {occupancy && (
                      <form
                        action={async () => {
                          "use server";
                          await moveOutResidentAction(estateSlug, occupancy.id);
                        }}
                      >
                        <button type="submit" className="text-xs text-slate-500 underline underline-offset-2">
                          Move out
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

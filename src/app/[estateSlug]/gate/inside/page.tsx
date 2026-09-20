import { Badge, Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listCurrentlyInside } from "@/server/modules/visitors/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { formatDateTime } from "@/lib/utils";
import { checkOutAction } from "../actions";

export default async function CurrentlyInsidePage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "gate:*"));
  const estateLocale = await getEstateLocale(membership.estateId);
  const entries = await listCurrentlyInside(membership.estateId);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Currently Inside</h1>
        <p className="text-sm text-foreground-muted">{entries.length} visitor(s) on the property right now.</p>
      </div>

      <div className="space-y-2">
        {entries.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No one is currently checked in.</p>
          </Card>
        )}
        {entries.map((entry) => {
          const occupancy = entry.pass.resident.occupancies[0];
          const unit = occupancy ? `${occupancy.unit.property.addressLabel}${occupancy.unit.label ? ` · ${occupancy.unit.label}` : ""}` : "No unit on file";
          return (
            <Card key={entry.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{entry.pass.visitorName}</p>
                  <p className="text-sm text-foreground-muted">{unit}</p>
                  <p className="text-xs text-foreground-muted">
                    Entered {formatDateTime(entry.checkInAt, estateLocale.timezone, estateLocale.locale)} · {entry.gate}
                    {entry.pass.vehicleNumber ? ` · ${entry.pass.vehicleNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">{entry.pass.passType}</Badge>
                  <form action={checkOutAction.bind(null, estateSlug, entry.id)}>
                    <Button type="submit" variant="secondary">
                      Record Exit
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

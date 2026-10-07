import { Button, Card, Input } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { getEstateLocale } from "@/server/modules/estates/service";
import { listAwaitingParcels } from "@/server/modules/parcels/service";
import { LogParcelForm } from "./LogParcelForm";
import { markCollectedAction } from "./actions";

export default async function GatePackagesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "gate:*"));

  const [awaiting, locale] = await Promise.all([listAwaitingParcels(membership.estateId), getEstateLocale(membership.estateId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Parcels</h1>
        <p className="mt-1 text-sm text-foreground-muted">Log parcels accepted at the gate and hand them over when collected.</p>
      </div>

      <Card>
        <LogParcelForm estateSlug={estateSlug} />
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Awaiting collection ({awaiting.length})</h2>
        {awaiting.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No parcels waiting at the gate.</p>
          </Card>
        ) : (
          awaiting.map((p) => {
            const unit = p.resident.occupancies[0]?.unit;
            return (
              <Card key={p.id}>
                <p className="font-medium">
                  {p.description}
                  {p.carrier ? ` · ${p.carrier}` : ""}
                </p>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  For {p.resident.firstName} {p.resident.lastName}
                  {unit ? ` · ${unit.property.addressLabel}${unit.label ? ` · ${unit.label}` : ""}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted">Received {formatDateTime(p.receivedAt, locale.timezone, locale.locale)}</p>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await markCollectedAction(estateSlug, p.id, formData);
                  }}
                  className="mt-3 flex gap-2"
                >
                  <Input name="collectedByName" placeholder="Collected by (optional)" className="flex-1" />
                  <Button type="submit" variant="secondary">
                    Handed over
                  </Button>
                </form>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}

import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";
import { getEstateLocale } from "@/server/modules/estates/service";
import { listParcelsForResident } from "@/server/modules/parcels/service";
import { getResidentByUserId } from "@/server/modules/residents/service";

export default async function MyPackagesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership, resident } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "own-property:read");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    return { membership, resident };
  });

  const [parcels, locale] = await Promise.all([listParcelsForResident(membership.estateId, resident.id), getEstateLocale(membership.estateId)]);
  const waiting = parcels.filter((p) => p.status === "AWAITING_COLLECTION");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Packages</h1>
        <p className="mt-1 text-sm text-foreground-muted">Parcels accepted at the gate for you. Collect them from security.</p>
      </div>

      {waiting.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm font-medium">
            {waiting.length} parcel{waiting.length === 1 ? "" : "s"} waiting at the gate
          </p>
        </Card>
      )}

      {parcels.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">No parcels yet. You&apos;ll be notified when one arrives at the gate.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {parcels.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {p.description}
                    {p.carrier ? ` · ${p.carrier}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    Arrived {formatDateTime(p.receivedAt, locale.timezone, locale.locale)}
                    {p.collectedAt ? ` · Collected ${formatDateTime(p.collectedAt, locale.timezone, locale.locale)}` : ""}
                  </p>
                </div>
                <Badge tone={p.status === "AWAITING_COLLECTION" ? "warning" : "success"}>
                  {p.status === "AWAITING_COLLECTION" ? "At the gate" : p.status === "COLLECTED" ? "Collected" : "Returned"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAccessibleContext } from "@/server/modules/tenantManagement/access";
import { listAccessibleProperties } from "@/server/modules/tenantManagement/property";
import { listAccessibleInspections } from "@/server/modules/tenantManagement/inspection";
import { formatDate } from "@/lib/utils";
import { InspectionForm } from "./InspectionForm";

const TYPE_TONE = {
  MOVE_IN: "info",
  ROUTINE: "neutral",
  MOVE_OUT: "warning",
  MAINTENANCE: "warning",
  OWNER_REQUESTED: "info",
} as const;

export default async function InspectionsPage() {
  const ctx = await guardPage(async () => getAccessibleContext(await requireUser()));
  const [properties, inspections] = await Promise.all([
    listAccessibleProperties(ctx.user),
    listAccessibleInspections(ctx.user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Property Inspections</h1>
        <p className="text-sm text-foreground-muted">
          Move-in, routine, move-out, maintenance and owner-requested inspections, kept in chronological order per unit.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Record an inspection</h2>
        <div className="mt-3">
          <InspectionForm
            properties={properties.map((p) => ({ id: p.id, name: p.name }))}
            units={properties.flatMap((p) =>
              p.units.map((u) => ({ id: u.id, label: u.label, propertyId: p.id, propertyName: p.name })),
            )}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {inspections.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No inspections recorded yet.</p>
          </Card>
        )}
        {inspections.map((inspection) => (
          <Card key={inspection.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {inspection.property.name}
                  {inspection.unit ? ` · ${inspection.unit.label}` : " · Whole property"}
                </p>
                <p className="text-sm text-foreground-muted">{formatDate(inspection.inspectedAt)}</p>
              </div>
              <Badge tone={TYPE_TONE[inspection.type]}>{inspection.type.replaceAll("_", " ")}</Badge>
            </div>
            {inspection.notes && <p className="mt-3 text-sm">{inspection.notes}</p>}
            {inspection.issuesFound && (
              <p className="mt-2 text-sm text-danger">
                <span className="font-medium">Issues: </span>
                {inspection.issuesFound}
              </p>
            )}
            {inspection.photoUrls.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3 text-sm">
                {inspection.photoUrls.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                      View photo
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

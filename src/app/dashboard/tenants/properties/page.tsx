import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAccessibleContext } from "@/server/modules/tenantManagement/access";
import { listAccessibleProperties } from "@/server/modules/tenantManagement/property";
import { formatNaira } from "@/lib/utils";
import { PropertyDocuments } from "@/components/shared/PropertyDocuments";
import { listPropertyDocuments } from "@/server/modules/tenantManagement/propertyDocuments";
import { CreatePropertyForm, CreateUnitForm, AssignManagerForm, AssignShortletOperatorForm } from "./PropertyForms";

export default async function PropertiesPage() {
  const ctx = await guardPage(async () => getAccessibleContext(await requireUser()));
  const properties = await listAccessibleProperties(ctx.user);
  const documentsByProperty = new Map(await Promise.all(properties.map(async (p) => [p.id, await listPropertyDocuments(ctx.user, p.id)] as const)));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Properties</h1>

      {ctx.ownerId && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="text-sm font-medium">Add a property</h2>
            <div className="mt-3">
              <CreatePropertyForm ownerId={ctx.ownerId} />
            </div>
          </Card>
          <Card>
            <h2 className="text-sm font-medium">Add a rental unit</h2>
            <div className="mt-3">
              <CreateUnitForm properties={properties.map((p) => ({ id: p.id, name: p.name }))} />
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {properties.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No properties yet. Add your first property above.</p>
          </Card>
        )}
        {properties.map((property) => (
          <Card key={property.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{property.name}</p>
                <p className="text-sm text-foreground-muted">
                  {property.addressLine}, {property.city}
                  {property.state ? `, ${property.state}` : ""}
                </p>
              </div>
              <Badge>{property.propertyType.replaceAll("_", " ")}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {property.units.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{unit.label}</p>
                    <p className="text-xs text-foreground-muted">
                      {formatNaira(unit.rentAmountMinor)} / {unit.rentFrequency.toLowerCase()}
                    </p>
                  </div>
                  <Badge tone={unit.status === "OCCUPIED" ? "success" : unit.status === "VACANT" ? "neutral" : "warning"}>
                    {unit.status}
                  </Badge>
                </div>
              ))}
              {property.units.length === 0 && <p className="text-sm text-foreground-muted">No units added yet.</p>}
            </div>

            <details className="mt-4 border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-medium">Documents ({documentsByProperty.get(property.id)?.length ?? 0})</summary>
              <div className="mt-3">
                <PropertyDocuments propertyId={property.id} documents={(documentsByProperty.get(property.id) ?? []).map((d) => ({ id: d.id, title: d.title, category: d.category, url: d.url }))} />
              </div>
            </details>

            {ctx.ownerId === property.ownerId && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <AssignManagerForm propertyId={property.id} />
                <AssignShortletOperatorForm propertyId={property.id} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

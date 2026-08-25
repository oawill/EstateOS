import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listProperties } from "@/server/modules/properties/service";

export default async function PropertiesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "properties:*"));
  const properties = await listProperties(membership.estateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Properties</h1>
        <Link href={`/${estateSlug}/properties/new`}>
          <Button>Add property</Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No properties yet. Add your first property to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <Card key={property.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{property.addressLabel}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {property.propertyType.replaceAll("_", " ")}
                    {property.block ? ` · Block ${property.block.name}` : ""}
                    {property.street ? ` · ${property.street.name}` : ""}
                    {property.zone ? ` · ${property.zone.name}` : ""}
                  </p>
                </div>
                <Badge>{property.units.length === 1 ? "1 unit" : `${property.units.length} units`}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

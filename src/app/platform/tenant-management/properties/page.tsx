import Link from "next/link";
import { Badge, Button, Card, Input } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { searchProperties } from "@/server/modules/tenantManagement/platformAdmin";

export default async function PlatformPropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await guardPage(() => requirePlatformAdmin());
  const { q } = await searchParams;
  const properties = await searchProperties(q);

  return (
    <div className="space-y-4">
      <Card>
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by property name, city or owner" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q && (
            <Link href="/platform/tenant-management/properties">
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          )}
        </form>
      </Card>

      <div className="space-y-3">
        {properties.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No properties match this search.</p>
          </Card>
        )}
        {properties.map((property) => (
          <Card key={property.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{property.name}</p>
              <p className="text-sm text-foreground-muted">
                {property.addressLine}, {property.city} · Owner: {property.owner.name}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge>{property._count.units} unit{property._count.units === 1 ? "" : "s"}</Badge>
              {property._count.managers > 0 && <Badge tone="info">{property._count.managers} manager{property._count.managers === 1 ? "" : "s"}</Badge>}
              <Badge tone="neutral">{property.propertyType.replaceAll("_", " ")}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

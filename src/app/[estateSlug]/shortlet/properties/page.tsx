import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatCurrency } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { getOrCreateShortletSettings } from "@/server/modules/shortlet/settings";
import { listProperties } from "@/server/modules/shortlet/properties";

const STATUS_TONE = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  MAINTENANCE: "warning",
  UNAVAILABLE: "danger",
} as const;

export default async function ShortletPropertiesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { properties, currency } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-properties:*");
    const [properties, settings] = await Promise.all([
      listProperties(membership.estateId),
      getOrCreateShortletSettings(membership.estateId),
    ]);
    return { properties, currency: settings.defaultCurrency };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Properties</h1>
        <Link href={`/${estateSlug}/shortlet/properties/new`}>
          <Button type="button">Add property</Button>
        </Link>
      </div>

      {properties.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">No properties yet.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {properties.map((property) => (
          <Link key={property.id} href={`/${estateSlug}/shortlet/properties/${property.id}`}>
            <Card className="h-full transition-colors hover:bg-surface-muted">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{property.name}</p>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {property.city}, {property.country}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[property.status]}>{property.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-foreground-muted">
                {property.bedrooms} bed · {property.bathrooms} bath · up to {property.maxGuests} guests ·{" "}
                {property.units.length} unit{property.units.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-sm font-medium">{formatCurrency(property.baseNightlyRateMinor, currency)}/night</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { Badge, Button, Card, Input, Label, Select } from "@/components/shared/ui";
import { formatCurrency } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { getOrCreateShortletSettings } from "@/server/modules/shortlet/settings";
import { getProperty } from "@/server/modules/shortlet/properties";
import { addUnitAction, updatePropertyStatusAction } from "../actions";

const STATUS_TONE = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  MAINTENANCE: "warning",
  UNAVAILABLE: "danger",
} as const;

const STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE", "UNAVAILABLE"] as const;

export default async function ShortletPropertyDetailPage({
  params,
}: {
  params: Promise<{ estateSlug: string; propertyId: string }>;
}) {
  const { estateSlug, propertyId } = await params;
  const { property, currency } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-properties:*");
    const [property, settings] = await Promise.all([
      getProperty(membership.estateId, propertyId),
      getOrCreateShortletSettings(membership.estateId),
    ]);
    // A property may override the estate-wide default currency (e.g. a
    // portfolio spanning multiple markets) — null means "use the default."
    return { property, currency: property.currency ?? settings.defaultCurrency };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{property.name}</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">
            {property.address}, {property.city}, {property.country}
          </p>
        </div>
        <Badge tone={STATUS_TONE[property.status]}>{property.status}</Badge>
      </div>

      {property.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {property.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt="" className="h-24 w-24 rounded-lg border border-border object-cover" />
          ))}
        </div>
      )}

      <Card className="space-y-3">
        <p className="text-sm font-medium text-foreground-muted">Details</p>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-foreground-muted">Type</p>
            <p className="font-medium">{property.propertyType}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Bed / Bath</p>
            <p className="font-medium">
              {property.bedrooms} / {property.bathrooms}
            </p>
          </div>
          <div>
            <p className="text-foreground-muted">Max guests</p>
            <p className="font-medium">{property.maxGuests}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Nightly rate</p>
            <p className="font-medium">{formatCurrency(property.baseNightlyRateMinor, currency)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Cleaning fee</p>
            <p className="font-medium">{formatCurrency(property.cleaningFeeMinor, currency)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Security deposit</p>
            <p className="font-medium">{formatCurrency(property.securityDepositMinor, currency)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Check-in / Check-out</p>
            <p className="font-medium">
              {property.checkInTime} / {property.checkOutTime}
            </p>
          </div>
          <div>
            <p className="text-foreground-muted">Stay length</p>
            <p className="font-medium">
              {property.minStayNights}–{property.maxStayNights ?? "∞"} nights
            </p>
          </div>
        </div>
        {property.amenities.length > 0 && (
          <div>
            <p className="text-sm text-foreground-muted">Amenities</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {property.amenities.map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
            </div>
          </div>
        )}
        {property.description && <p className="text-sm">{property.description}</p>}
        {property.houseRules && (
          <div>
            <p className="text-sm font-medium text-foreground-muted">House rules</p>
            <p className="text-sm">{property.houseRules}</p>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-foreground-muted">Status</p>
        <form action={updatePropertyStatusAction.bind(null, estateSlug, propertyId)} className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="status">Change status</Label>
            <Select id="status" name="status" defaultValue={property.status}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Update
          </Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-foreground-muted">Units ({property.units.length})</p>
        <div className="space-y-2">
          {property.units.map((unit) => (
            <div key={unit.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <p className="text-sm font-medium">{unit.unitLabel}</p>
              <Badge tone={STATUS_TONE[unit.status]}>{unit.status}</Badge>
            </div>
          ))}
        </div>
        <form action={addUnitAction.bind(null, estateSlug, propertyId)} className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="unitLabel">Add another unit</Label>
            <Input id="unitLabel" name="unitLabel" placeholder="e.g. Unit 2B" required />
          </div>
          <Button type="submit" variant="secondary">
            Add unit
          </Button>
        </form>
      </Card>
    </div>
  );
}

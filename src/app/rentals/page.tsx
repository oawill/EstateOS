import Link from "next/link";
import { Card, Button, Input, Label, Select } from "@/components/shared/ui";
import { searchPublicListings } from "@/server/modules/tenantManagement/listing";
import { formatNaira, formatDate } from "@/lib/utils";

const PROPERTY_TYPES = ["APARTMENT_BUILDING", "DUPLEX", "DETACHED_HOUSE", "TERRACE", "FLAT", "COMMERCIAL", "MIXED_USE", "OTHER"];

export default async function RentalsMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    city?: string;
    minRent?: string;
    maxRent?: string;
    bedrooms?: string;
    propertyType?: string;
    furnishedStatus?: string;
  }>;
}) {
  const params = await searchParams;

  const listings = await searchPublicListings({
    state: params.state || undefined,
    city: params.city || undefined,
    minRentMinor: params.minRent ? Math.round(Number(params.minRent) * 100) : undefined,
    maxRentMinor: params.maxRent ? Math.round(Number(params.maxRent) * 100) : undefined,
    bedrooms: params.bedrooms ? Number(params.bedrooms) : undefined,
    propertyType: params.propertyType || undefined,
    furnishedStatus: params.furnishedStatus || undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Rentals</h1>
        <p className="mt-1 text-sm text-foreground-muted">Available homes managed on NidraQ.</p>
      </div>

      <Card>
        <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div>
            <Label htmlFor="f-state">State</Label>
            <Input id="f-state" name="state" defaultValue={params.state} />
          </div>
          <div>
            <Label htmlFor="f-city">City</Label>
            <Input id="f-city" name="city" defaultValue={params.city} />
          </div>
          <div>
            <Label htmlFor="f-min">Min Rent (₦)</Label>
            <Input id="f-min" name="minRent" type="number" min={0} defaultValue={params.minRent} />
          </div>
          <div>
            <Label htmlFor="f-max">Max Rent (₦)</Label>
            <Input id="f-max" name="maxRent" type="number" min={0} defaultValue={params.maxRent} />
          </div>
          <div>
            <Label htmlFor="f-bedrooms">Bedrooms</Label>
            <Input id="f-bedrooms" name="bedrooms" type="number" min={0} defaultValue={params.bedrooms} />
          </div>
          <div>
            <Label htmlFor="f-type">Property Type</Label>
            <Select id="f-type" name="propertyType" defaultValue={params.propertyType ?? ""}>
              <option value="">Any</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="f-furnished">Furnished</Label>
            <Select id="f-furnished" name="furnishedStatus" defaultValue={params.furnishedStatus ?? ""}>
              <option value="">Any</option>
              <option value="UNFURNISHED">Unfurnished</option>
              <option value="SEMI_FURNISHED">Semi-furnished</option>
              <option value="FURNISHED">Furnished</option>
            </Select>
          </div>
          <div className="col-span-2 flex items-end sm:col-span-4 lg:col-span-7">
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No listings match these filters right now.</p>
          </Card>
        )}
        {listings.map((listing) => (
          <Link key={listing.listingReference} href={`/rentals/${listing.listingReference}`}>
            <Card className="h-full cursor-pointer hover:border-primary">
              {listing.imageUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.imageUrls[0]} alt={listing.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
              )}
              <p className="font-medium">{listing.title}</p>
              <p className="text-sm text-foreground-muted">
                {listing.displayArea || listing.unit.property.city} · {listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath
              </p>
              <p className="mt-2 font-semibold">
                {formatNaira(listing.rentAmountMinor)} / {listing.rentFrequency.toLowerCase()}
              </p>
              <p className="text-xs text-foreground-muted">Available {formatDate(listing.availableDate)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

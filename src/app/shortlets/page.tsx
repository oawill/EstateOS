import Link from "next/link";
import { Card, Button, Input, Label } from "@/components/shared/ui";
import { searchPublicListings } from "@/server/modules/shortletManagement/listing";
import { formatNaira } from "@/lib/utils";

export default async function ShortletsMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; state?: string; minRent?: string; maxRent?: string; maxGuests?: string }>;
}) {
  const params = await searchParams;

  const listings = await searchPublicListings({
    city: params.city || undefined,
    state: params.state || undefined,
    minRentMinor: params.minRent ? Math.round(Number(params.minRent) * 100) : undefined,
    maxRentMinor: params.maxRent ? Math.round(Number(params.maxRent) * 100) : undefined,
    maxGuests: params.maxGuests ? Number(params.maxGuests) : undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Shortlets</h1>
        <p className="mt-1 text-sm text-foreground-muted">Serviced apartments and short-term stays managed on NidraQ.</p>
      </div>

      <Card>
        <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <Label htmlFor="f-state">State</Label>
            <Input id="f-state" name="state" defaultValue={params.state} />
          </div>
          <div>
            <Label htmlFor="f-city">City</Label>
            <Input id="f-city" name="city" defaultValue={params.city} />
          </div>
          <div>
            <Label htmlFor="f-min">Min Rate/Night (₦)</Label>
            <Input id="f-min" name="minRent" type="number" min={0} defaultValue={params.minRent} />
          </div>
          <div>
            <Label htmlFor="f-max">Max Rate/Night (₦)</Label>
            <Input id="f-max" name="maxRent" type="number" min={0} defaultValue={params.maxRent} />
          </div>
          <div>
            <Label htmlFor="f-guests">Guests</Label>
            <Input id="f-guests" name="maxGuests" type="number" min={1} defaultValue={params.maxGuests} />
          </div>
          <div className="col-span-2 flex items-end sm:col-span-5">
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No shortlets match these filters right now.</p>
          </Card>
        )}
        {listings.map((listing) => (
          <Link key={listing.listingReference} href={`/shortlets/${listing.listingReference}`}>
            <Card className="h-full cursor-pointer hover:border-primary">
              {listing.imageUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.imageUrls[0]} alt={listing.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
              )}
              <p className="font-medium">{listing.title}</p>
              <p className="text-sm text-foreground-muted">
                {listing.property.city} · {listing.bedrooms ?? "—"} bed · sleeps {listing.maxGuests}
              </p>
              <p className="mt-2 font-semibold">{formatNaira(listing.baseNightlyRateMinor)} / night</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button, Input, Label } from "@/components/shared/ui";
import { searchPublicListings } from "@/server/modules/shortletManagement/listing";
import { formatNaira } from "@/lib/utils";
import { PropertyImage, EmptyState } from "@/app/dashboard/shortlets/ui";

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
    <div className="shortlet-scope min-h-screen bg-background">
      <div className="border-b border-border bg-navy py-12 text-white sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find your next stay</h1>
          <p className="mt-2 max-w-xl text-white/70">Serviced apartments and short-term stays, professionally managed on NidraQ.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <form method="get" className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-5 sm:p-5">
          <div>
            <Label htmlFor="f-state">State</Label>
            <Input id="f-state" name="state" defaultValue={params.state} />
          </div>
          <div>
            <Label htmlFor="f-city">City</Label>
            <Input id="f-city" name="city" defaultValue={params.city} />
          </div>
          <div>
            <Label htmlFor="f-min">Min ₦/night</Label>
            <Input id="f-min" name="minRent" type="number" min={0} defaultValue={params.minRent} />
          </div>
          <div>
            <Label htmlFor="f-max">Max ₦/night</Label>
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

        {listings.length === 0 ? (
          <EmptyState
            title="No stays match these filters yet."
            description="Try widening your search, or check back soon as more properties come online."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link key={listing.listingReference} href={`/shortlets/${listing.listingReference}`} className="group">
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <PropertyImage src={listing.imageUrls[0]} alt={listing.title} className="h-48 w-full" />
                  <div className="p-4">
                    <p className="font-semibold text-foreground">{listing.title}</p>
                    <p className="mt-0.5 text-sm text-foreground-muted">
                      {listing.property.city} · {listing.bedrooms ?? "—"} bed · sleeps {listing.maxGuests}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatNaira(listing.baseNightlyRateMinor)} <span className="text-sm font-normal text-foreground-muted">/ night</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

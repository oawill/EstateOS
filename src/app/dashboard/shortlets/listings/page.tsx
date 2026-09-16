import Link from "next/link";
import { Card, Badge, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listAccessibleListings } from "@/server/modules/shortletManagement/listing";
import { formatNaira } from "@/lib/utils";
import { updateListingStatusAction } from "../actions";

export default async function ShortletListingsPage() {
  const user = await guardPage(() => requireUser());
  const listings = await listAccessibleListings(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shortlet Listings</h1>
      </div>

      <div className="space-y-3">
        {listings.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">
              No shortlet listings yet — create one from the overview page&apos;s eligible units list.
            </p>
          </Card>
        )}
        {listings.map((listing) => (
          <Card key={listing.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/dashboard/shortlets/listings/${listing.id}`} className="font-medium hover:underline">
                  {listing.title} · {listing.listingReference}
                </Link>
                <p className="text-sm text-foreground-muted">
                  {listing.property.name} · {listing.unit.label} · {formatNaira(listing.baseNightlyRateMinor)}/night
                </p>
                <p className="text-xs text-foreground-muted">{listing._count.bookings} booking(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={listing.status === "ACTIVE" ? "success" : listing.status === "DRAFT" ? "warning" : "neutral"}>
                  {listing.status}
                </Badge>
                {listing.status === "DRAFT" && (
                  <form action={updateListingStatusAction.bind(null, listing.id, "ACTIVE")}>
                    <Button type="submit" variant="secondary">
                      Publish
                    </Button>
                  </form>
                )}
                {listing.status === "ACTIVE" && (
                  <form action={updateListingStatusAction.bind(null, listing.id, "INACTIVE")}>
                    <Button type="submit" variant="danger">
                      Deactivate
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

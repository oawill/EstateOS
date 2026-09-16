import Link from "next/link";
import { Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listAccessibleListings } from "@/server/modules/shortletManagement/listing";
import { formatNaira } from "@/lib/utils";
import { StatusPill, PropertyImage, EmptyState, SectionHeading } from "../ui";
import { updateListingStatusAction } from "../actions";

export default async function ShortletListingsPage() {
  const user = await guardPage(() => requireUser());
  const listings = await listAccessibleListings(user);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Properties"
        action={
          <Link href="/dashboard/shortlets/listings/new">
            <Button>+ Add Property</Button>
          </Link>
        }
      />

      {listings.length === 0 ? (
        <EmptyState
          title="Add your first shortlet."
          description="Start managing bookings, guests, revenue and operations from one place."
          cta={
            <Link href="/dashboard/shortlets/listings/new">
              <Button>Add Property</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div key={listing.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <Link href={`/dashboard/shortlets/listings/${listing.id}`}>
                <PropertyImage src={listing.imageUrls[0]} alt={listing.title} className="h-44 w-full" />
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/shortlets/listings/${listing.id}`} className="min-w-0">
                    <p className="truncate font-semibold text-foreground hover:underline">{listing.title}</p>
                    <p className="text-xs text-foreground-muted">
                      {listing.property.name} · {listing.unit.label}
                    </p>
                  </Link>
                  <StatusPill status={listing.status} />
                </div>
                <p className="mt-3 text-sm font-semibold">
                  {formatNaira(listing.baseNightlyRateMinor)} <span className="font-normal text-foreground-muted">/ night</span>
                </p>
                <p className="mt-1 text-xs text-foreground-muted">{listing._count.bookings} booking(s) all-time</p>

                <div className="mt-3 flex gap-2">
                  {listing.status === "DRAFT" && (
                    <form action={updateListingStatusAction.bind(null, listing.id, "ACTIVE")}>
                      <Button type="submit" variant="secondary" className="w-full">
                        Publish
                      </Button>
                    </form>
                  )}
                  {listing.status === "ACTIVE" && (
                    <form action={updateListingStatusAction.bind(null, listing.id, "INACTIVE")} className="w-full">
                      <Button type="submit" variant="danger" className="w-full">
                        Deactivate
                      </Button>
                    </form>
                  )}
                  {listing.status === "INACTIVE" && (
                    <form action={updateListingStatusAction.bind(null, listing.id, "ACTIVE")} className="w-full">
                      <Button type="submit" variant="secondary" className="w-full">
                        Reactivate
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Badge } from "@/components/shared/ui";
import { getPublicListingByReference } from "@/server/modules/shortletManagement/listing";
import { formatNaira } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { PropertyImage } from "@/app/dashboard/shortlets/ui";
import { BookingRequestForm } from "./ClientControls";

export default async function ShortletListingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const listing = await getPublicListingByReference(reference).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  if (!listing) notFound();

  const [cover, ...gallery] = listing.imageUrls;

  return (
    <div className="shortlet-scope min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link href="/shortlets" className="text-sm text-primary hover:underline">
          ← Back to Shortlets
        </Link>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <PropertyImage src={cover} alt={listing.title} className="h-56 rounded-2xl sm:col-span-2 sm:h-80" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            {gallery.slice(0, 2).map((url) => (
              <PropertyImage key={url} src={url} alt={listing.title} className="h-28 rounded-2xl sm:h-[9.5rem]" />
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{listing.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {listing.property.city}, {listing.property.state}
          </p>
          <p className="mt-3 text-xl font-semibold">
            {formatNaira(listing.baseNightlyRateMinor)} <span className="text-sm font-normal text-foreground-muted">/ night</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="info">{listing.bedrooms ?? "—"} bed</Badge>
            <Badge tone="info">{listing.bathrooms ?? "—"} bath</Badge>
            <Badge tone="info">Sleeps {listing.maxGuests}</Badge>
            <Badge tone="success">
              Check-in {listing.checkInTime} · Check-out {listing.checkOutTime}
            </Badge>
          </div>
        </div>

        <Card>
          <h2 className="text-sm font-semibold">About this stay</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-foreground-muted">{listing.description}</p>
          {listing.amenities.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Amenities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {listing.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {listing.houseRules && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">House Rules</p>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground-muted">{listing.houseRules}</p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Check Availability &amp; Book</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Submitting a request holds these dates and creates a pending booking — the operator will follow up with payment
            details to confirm it.
          </p>
          <div className="mt-3">
            <BookingRequestForm listingReference={listing.listingReference} maxGuests={listing.maxGuests} minStayNights={listing.minStayNights} />
          </div>
        </Card>
      </div>
    </div>
  );
}

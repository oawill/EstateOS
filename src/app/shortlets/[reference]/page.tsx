import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Badge } from "@/components/shared/ui";
import { getPublicListingByReference } from "@/server/modules/shortletManagement/listing";
import { formatNaira } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { BookingRequestForm } from "./ClientControls";

export default async function ShortletListingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const listing = await getPublicListingByReference(reference).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link href="/shortlets" className="text-sm text-primary hover:underline">
          ← Back to Shortlets
        </Link>
      </div>

      {listing.imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.imageUrls.slice(0, 6).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={listing.title} className="h-32 w-full rounded-lg object-cover sm:h-40" />
          ))}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {listing.property.city}, {listing.property.state}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {formatNaira(listing.baseNightlyRateMinor)} <span className="text-sm font-normal text-foreground-muted">/ night</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="info">{listing.bedrooms ?? "—"} bed</Badge>
          <Badge tone="info">{listing.bathrooms ?? "—"} bath</Badge>
          <Badge tone="info">Sleeps {listing.maxGuests}</Badge>
          <Badge tone="success">Check-in {listing.checkInTime} · Check-out {listing.checkOutTime}</Badge>
        </div>
      </div>

      <Card>
        <h2 className="text-sm font-medium">About this stay</h2>
        <p className="mt-2 whitespace-pre-line text-sm">{listing.description}</p>
        {listing.amenities.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Amenities</p>
            <p className="mt-1 text-sm">{listing.amenities.join(" · ")}</p>
          </div>
        )}
        {listing.houseRules && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">House Rules</p>
            <p className="mt-1 whitespace-pre-line text-sm">{listing.houseRules}</p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Check Availability &amp; Book</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          Submitting a request holds these dates and creates a pending booking — the operator will follow up with payment
          details to confirm it.
        </p>
        <div className="mt-3">
          <BookingRequestForm listingReference={listing.listingReference} maxGuests={listing.maxGuests} minStayNights={listing.minStayNights} />
        </div>
      </Card>
    </div>
  );
}

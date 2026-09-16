import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Button, Badge } from "@/components/shared/ui";
import { getPublicListingByReference } from "@/server/modules/tenantManagement/listing";
import { formatNaira, formatDate } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { InquiryForm, ViewingRequestForm } from "./ClientControls";

export default async function RentalListingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const listing = await getPublicListingByReference(reference).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  if (!listing) notFound();

  const canApply = listing.status === "AVAILABLE" || listing.status === "APPLICATIONS_OPEN";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link href="/rentals" className="text-sm text-primary hover:underline">
          ← Back to Rentals
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
          {listing.displayArea || listing.unit.property.city}, {listing.unit.property.state}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {formatNaira(listing.rentAmountMinor)} <span className="text-sm font-normal text-foreground-muted">/ {listing.rentFrequency.toLowerCase()}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="info">{listing.bedrooms ?? "—"} bed</Badge>
          <Badge tone="info">{listing.bathrooms ?? "—"} bath</Badge>
          <Badge tone="info">{listing.furnishedStatus.replaceAll("_", " ")}</Badge>
          <Badge tone="success">Available {formatDate(listing.availableDate)}</Badge>
        </div>
      </div>

      <Card>
        <h2 className="text-sm font-medium">About this property</h2>
        <p className="mt-2 whitespace-pre-line text-sm">{listing.description}</p>
        {listing.amenities.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Amenities</p>
            <p className="mt-1 text-sm">{listing.amenities.join(" · ")}</p>
          </div>
        )}
        {listing.rules && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">House Rules</p>
            <p className="mt-1 whitespace-pre-line text-sm">{listing.rules}</p>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        {canApply && (
          <Link href={`/apply/${listing.listingReference}`}>
            <Button>Apply Now</Button>
          </Link>
        )}
      </div>

      <Card>
        <h2 className="text-sm font-medium">Schedule a Viewing</h2>
        <div className="mt-3">
          <ViewingRequestForm listingReference={listing.listingReference} />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Ask a Question</h2>
        <div className="mt-3">
          <InquiryForm listingReference={listing.listingReference} />
        </div>
      </Card>
    </div>
  );
}

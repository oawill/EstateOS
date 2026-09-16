import { notFound } from "next/navigation";
import { Card } from "@/components/shared/ui";
import { getPublicListingByReference } from "@/server/modules/tenantManagement/listing";
import { NotFoundError } from "@/lib/errors";
import { StartApplicationForm } from "./ClientControls";

export default async function StartApplicationPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const listing = await getPublicListingByReference(reference).catch((error) => {
    if (error instanceof NotFoundError) return null;
    throw error;
  });
  if (!listing || !["AVAILABLE", "APPLICATIONS_OPEN"].includes(listing.status)) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Apply for {listing.title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {formatRentSummary(listing.rentAmountMinor, listing.rentFrequency)} — you can save your progress and come back anytime before submitting.
        </p>
      </div>

      <Card>
        <StartApplicationForm listingReference={reference} />
      </Card>
    </div>
  );
}

function formatRentSummary(rentAmountMinor: number, frequency: string) {
  const naira = (rentAmountMinor / 100).toLocaleString();
  return `₦${naira} / ${frequency.toLowerCase()}`;
}

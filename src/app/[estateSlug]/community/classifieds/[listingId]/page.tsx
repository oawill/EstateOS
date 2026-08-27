import { Badge, Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { LISTING_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { getListing } from "@/server/modules/community/classifieds";
import { getOrCreateCommunitySettings } from "@/server/modules/community/settings";
import { getDisplayIdentity } from "@/server/modules/community/identity";
import { ContactSellerForm, SaveListingButton, SellerControls } from "./ListingDetailActions";
import { ReportForm } from "../../FeedList";

export default async function ListingDetailPage({ params }: { params: Promise<{ estateSlug: string; listingId: string }> }) {
  const { estateSlug, listingId } = await params;

  const { listing, isSeller, identity } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "community-listings:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const [listing, settings] = await Promise.all([
      getListing(membership.estateId, listingId),
      getOrCreateCommunitySettings(membership.estateId),
    ]);
    return {
      listing,
      isSeller: listing.sellerResidentId === resident.id,
      identity: getDisplayIdentity(listing.seller, settings.defaultDisplayNamePreference),
    };
  });

  return (
    <div className="max-w-lg space-y-4">
      <Card>
        {listing.images.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {listing.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={img.url} alt="" className="h-48 w-48 flex-shrink-0 rounded-lg object-cover" />
            ))}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">{listing.title}</h1>
          <Badge tone={LISTING_STATUS_TONE[listing.status]}>{listing.status}</Badge>
        </div>
        <p className="mt-2 text-2xl font-semibold text-primary">
          {listing.category.key === "SHORTLETS" && listing.nightlyRateKobo
            ? `${formatNaira(listing.nightlyRateKobo)}/night`
            : listing.priceKobo
              ? formatNaira(listing.priceKobo)
              : "Free"}
        </p>
        {listing.negotiable && <Badge tone="warning">Negotiable</Badge>}
        <p className="mt-3 whitespace-pre-wrap text-sm">{listing.description}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-sm text-foreground-muted">
          {listing.condition && <span>{listing.condition.replaceAll("_", " ")}</span>}
          {listing.locationNote && <span>· {listing.locationNote}</span>}
          {listing.category.key === "SHORTLETS" && (
            <span>
              · {listing.bedrooms ?? "?"} bed · max {listing.maxGuests ?? "?"} guests
            </span>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <p className="text-sm font-medium">
            {identity.name}
            {identity.badges.map((b) => (
              <Badge key={b} tone="neutral">
                {" "}
                {b}
              </Badge>
            ))}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">Listed {formatDate(listing.createdAt)}</p>
        </div>
      </Card>

      {isSeller ? (
        <SellerControls estateSlug={estateSlug} listingId={listing.id} status={listing.status} />
      ) : (
        <ContactSellerForm
          estateSlug={estateSlug}
          listingId={listing.id}
          whatsappNumber={listing.whatsappNumber}
          phoneNumber={listing.phoneNumber}
          contactMethods={listing.contactMethods}
        />
      )}

      <div className="flex items-center justify-between">
        {!isSeller && <SaveListingButton estateSlug={estateSlug} listingId={listing.id} />}
        <ReportForm estateSlug={estateSlug} targetType="LISTING" targetId={listing.id} />
      </div>
    </div>
  );
}

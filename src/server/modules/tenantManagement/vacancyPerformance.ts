import { prisma } from "@/server/db/client";
import { getAuthorizedPropertyIds } from "./access";
import type { CurrentUser } from "@/server/auth/session";

/**
 * Per-listing funnel metrics for the vacancy performance view. Every rate
 * is left `null` (never 0%) when its denominator is 0, so an empty funnel
 * reads as "no data yet" rather than a fabricated 0% conversion.
 */
export async function getVacancyPerformance(actor: CurrentUser) {
  const propertyIds = await getAuthorizedPropertyIds(actor);

  const listings = await prisma.rentalListing.findMany({
    where: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } },
    include: {
      unit: { include: { property: true } },
      _count: { select: { inquiries: true, viewings: true, applications: true } },
      offers: { where: { status: "ACCEPTED" }, orderBy: { respondedAt: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return listings.map((listing) => {
    const inquiryCount = listing._count.inquiries;
    const viewingCount = listing._count.viewings;
    const applicationCount = listing._count.applications;
    const offerAcceptedAt = listing.offers[0]?.respondedAt ?? null;

    const now = new Date();
    const daysVacant = Math.round(((listing.status === "LEASED" ? listing.updatedAt : now).getTime() - listing.createdAt.getTime()) / 86_400_000);
    const daysOnMarket = listing.publishedAt
      ? Math.round(((listing.status === "LEASED" ? listing.updatedAt : now).getTime() - listing.publishedAt.getTime()) / 86_400_000)
      : null;

    return {
      listingId: listing.id,
      listingReference: listing.listingReference,
      title: listing.title,
      property: listing.unit.property.name,
      unit: listing.unit.label,
      status: listing.status,
      dateVacant: listing.createdAt,
      dateListed: listing.publishedAt,
      inquiryCount,
      viewingCount,
      applicationCount,
      offerAcceptedAt,
      occupiedAt: listing.status === "LEASED" ? listing.updatedAt : null,
      daysVacant,
      daysOnMarket,
      inquiryToViewingRate: inquiryCount > 0 ? Math.round((viewingCount / inquiryCount) * 100) : null,
      viewingToApplicationRate: viewingCount > 0 ? Math.round((applicationCount / viewingCount) * 100) : null,
      applicationToLeaseRate: applicationCount > 0 ? Math.round((listing.status === "LEASED" ? 1 / applicationCount : 0) * 100) : null,
    };
  });
}

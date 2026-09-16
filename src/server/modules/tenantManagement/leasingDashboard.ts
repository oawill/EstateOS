import { prisma } from "@/server/db/client";
import type { CurrentUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "./access";

/**
 * The Phase 3 leasing dashboard's KPI strip plus an operational "Needs
 * Attention" queue — deliberately built from real rows rather than
 * decorative counters, so each number links to something a manager can
 * act on directly (e.g. "Applications Awaiting Review" is the exact list
 * the pipeline page would show filtered to REVIEWING).
 */
export async function getLeasingDashboard(actor: CurrentUser) {
  const propertyIds = await getAuthorizedPropertyIds(actor);
  const listingWhere = propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } };
  const unitWhere = propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } };

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const now = new Date();

  const [
    vacantUnits,
    newInquiries,
    viewingsThisWeek,
    totalApplications,
    applicationsAwaitingReview,
    offersOutstanding,
    leasesAwaitingSignature,
    moveInsUpcoming,
    staleInquiries,
    overdueViewingOutcomes,
    expiringOffers,
  ] = await Promise.all([
    prisma.rentalUnit.count({ where: { ...unitWhere, status: "VACANT" } }),
    prisma.rentalInquiry.count({ where: { status: "NEW", listing: listingWhere } }),
    prisma.viewing.count({
      where: { preferredDate: { gte: weekAgo, lte: now }, listing: listingWhere, status: { in: ["REQUESTED", "CONFIRMED", "COMPLETED"] } },
    }),
    prisma.rentalApplication.count({ where: { listing: listingWhere, status: { not: "STARTED" } } }),
    prisma.rentalApplication.count({ where: { listing: listingWhere, status: "REVIEWING" } }),
    prisma.rentalOffer.count({ where: { status: "SENT", listing: listingWhere } }),
    prisma.lease.count({ where: { documentStatus: { in: ["SENT_TO_TENANT", "PENDING_SIGNATURE"] }, unit: unitWhere } }),
    prisma.moveIn.count({ where: { stage: { not: "COMPLETED" }, unit: unitWhere } }),
    prisma.rentalInquiry.findMany({
      where: { status: "NEW", createdAt: { lt: weekAgo }, listing: listingWhere },
      include: { listing: { include: { unit: { include: { property: true } } } } },
      take: 10,
    }),
    prisma.viewing.findMany({
      where: { status: "COMPLETED", attended: null, listing: listingWhere },
      include: { listing: { include: { unit: { include: { property: true } } } } },
      take: 10,
    }),
    prisma.rentalOffer.findMany({
      where: { status: "SENT", expiresAt: { lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) }, listing: listingWhere },
      include: { application: true, listing: { include: { unit: { include: { property: true } } } } },
      take: 10,
    }),
  ]);

  // Average Days Vacant, computed only from listings that actually
  // recorded a publish date and have since been leased — never fabricated
  // for units with no history yet.
  const leasedWithDates = await prisma.rentalListing.findMany({
    where: { status: "LEASED", publishedAt: { not: null }, propertyId: propertyIds === "all" ? undefined : { in: propertyIds } },
    select: { publishedAt: true, updatedAt: true },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });
  const averageDaysVacant =
    leasedWithDates.length > 0
      ? Math.round(
          leasedWithDates.reduce((sum, l) => sum + (l.updatedAt.getTime() - l.publishedAt!.getTime()) / 86_400_000, 0) /
            leasedWithDates.length,
        )
      : null;

  return {
    kpis: {
      vacantUnits,
      newInquiries,
      viewingsThisWeek,
      totalApplications,
      applicationsAwaitingReview,
      offersOutstanding,
      leasesAwaitingSignature,
      moveInsUpcoming,
      averageDaysVacant,
    },
    needsAttention: {
      staleInquiries,
      overdueViewingOutcomes,
      expiringOffers,
    },
  };
}

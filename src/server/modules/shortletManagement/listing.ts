import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess, requireShortletOperator, getAuthorizedPropertyIds } from "./access";
import { nextShortletListingReference } from "./sequence";
import type { CreateShortletListingInput } from "./schema";

/** Fields safe to show publicly — no owner/operator identity, no internal unit/property ids beyond the listing's own public reference. */
const PUBLIC_LISTING_SELECT = {
  listingReference: true,
  title: true,
  description: true,
  bedrooms: true,
  bathrooms: true,
  maxGuests: true,
  amenities: true,
  imageUrls: true,
  houseRules: true,
  checkInTime: true,
  checkOutTime: true,
  baseNightlyRateMinor: true,
  cleaningFeeMinor: true,
  securityDepositMinor: true,
  minStayNights: true,
  maxStayNights: true,
  status: true,
  property: { select: { city: true, state: true, propertyType: true } },
} as const;

export async function createShortletListing(actor: CurrentUser, input: CreateShortletListingInput) {
  const { operatorId } = await requireShortletOperator(actor);

  const unit = await prisma.rentalUnit.findUnique({ where: { id: input.unitId }, include: { property: true, shortletListing: true } });
  if (!unit) throw new NotFoundError("Unit");
  await assertPropertyAccess(actor, unit.propertyId);
  if (unit.shortletListing) throw new ForbiddenError("This unit already has a shortlet listing");

  const listingReference = await nextShortletListingReference();

  const listing = await prisma.shortletListing.create({
    data: {
      listingReference,
      unitId: unit.id,
      propertyId: unit.propertyId,
      operatorId,
      title: input.title,
      description: input.description,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      maxGuests: input.maxGuests,
      amenities: input.amenities,
      imageUrls: input.imageUrls,
      houseRules: input.houseRules || null,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      baseNightlyRateMinor: input.baseNightlyRateMinor,
      cleaningFeeMinor: input.cleaningFeeMinor,
      securityDepositMinor: input.securityDepositMinor,
      minStayNights: input.minStayNights,
      maxStayNights: input.maxStayNights,
      status: "DRAFT",
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.listing.created",
    entityType: "ShortletListing",
    entityId: listing.id,
    after: listing,
  });

  return listing;
}

export async function updateListingStatus(actor: CurrentUser, listingId: string, status: "DRAFT" | "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "UNAVAILABLE") {
  const listing = await prisma.shortletListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);

  const updated = await prisma.shortletListing.update({ where: { id: listingId }, data: { status } });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.listing.status_changed",
    entityType: "ShortletListing",
    entityId: listingId,
    before: listing,
    after: updated,
  });

  return updated;
}

export async function listAccessibleListings(user: CurrentUser) {
  const propertyIds = await getAuthorizedPropertyIds(user);
  return prisma.shortletListing.findMany({
    where: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } },
    include: { unit: true, property: true, _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getListingDetail(actor: CurrentUser, listingId: string) {
  const listing = await prisma.shortletListing.findUnique({
    where: { id: listingId },
    include: { unit: true, property: true, ratePlans: { orderBy: { createdAt: "desc" } } },
  });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);
  return listing;
}

// --- Public marketplace -----------------------------------------------------

export interface ShortletSearchFilters {
  city?: string;
  state?: string;
  minRentMinor?: number;
  maxRentMinor?: number;
  maxGuests?: number;
}

export async function searchPublicListings(filters: ShortletSearchFilters) {
  return prisma.shortletListing.findMany({
    where: {
      status: "ACTIVE",
      baseNightlyRateMinor: { gte: filters.minRentMinor ?? undefined, lte: filters.maxRentMinor ?? undefined },
      maxGuests: filters.maxGuests ? { gte: filters.maxGuests } : undefined,
      property: {
        city: filters.city ? { equals: filters.city, mode: "insensitive" } : undefined,
        state: filters.state ? { equals: filters.state, mode: "insensitive" } : undefined,
      },
    },
    select: PUBLIC_LISTING_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublicListingByReference(listingReference: string) {
  const listing = await prisma.shortletListing.findUnique({
    where: { listingReference },
    select: { ...PUBLIC_LISTING_SELECT, id: true },
  });
  if (!listing || listing.status !== "ACTIVE") throw new NotFoundError("Listing");
  return listing;
}

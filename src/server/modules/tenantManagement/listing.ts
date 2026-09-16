import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { nextListingReference } from "./sequence";
import type { CreateListingInput } from "./schema";

/**
 * Fields safe to show on the public marketplace / property page — no
 * landlord identity, no internal ids beyond the listing's own public
 * reference, no tenant/applicant data. Server-side boundary per the
 * public/applicant/internal/landlord data-separation requirement.
 */
const PUBLIC_LISTING_SELECT = {
  listingReference: true,
  title: true,
  description: true,
  rentAmountMinor: true,
  rentFrequency: true,
  serviceChargeMinor: true,
  securityDepositMinor: true,
  bedrooms: true,
  bathrooms: true,
  furnishedStatus: true,
  availableDate: true,
  amenities: true,
  rules: true,
  imageUrls: true,
  videoUrls: true,
  displayArea: true,
  status: true,
  publishedAt: true,
  unit: {
    select: {
      property: { select: { city: true, state: true, propertyType: true } },
    },
  },
} as const;

/** A vacant unit still eligible for a brand-new listing — i.e. it has no listing row currently in an active (non-terminal) state. Distinct from property.ts's listVacantUnits(), which is unit-occupancy-only and doesn't care about listings. */
export async function listUnlistedVacantUnits(propertyIds: string[] | "all") {
  return prisma.rentalUnit.findMany({
    where: {
      status: "VACANT",
      property: propertyIds === "all" ? undefined : { id: { in: propertyIds } },
      listings: { none: { status: { notIn: ["WITHDRAWN", "LEASED"] } } },
    },
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createListing(actor: CurrentUser, input: CreateListingInput) {
  const unit = await prisma.rentalUnit.findUnique({ where: { id: input.unitId }, include: { property: true } });
  if (!unit) throw new NotFoundError("Unit");
  await assertPropertyAccess(actor, unit.propertyId);

  const openListing = await prisma.rentalListing.findFirst({
    where: { unitId: unit.id, status: { notIn: ["WITHDRAWN", "LEASED"] } },
  });
  if (openListing) throw new ForbiddenError("This unit already has an active listing — withdraw it before creating a new one.");

  const listingReference = await nextListingReference();

  const listing = await prisma.rentalListing.create({
    data: {
      listingReference,
      unitId: unit.id,
      propertyId: unit.propertyId,
      title: input.title,
      description: input.description,
      rentAmountMinor: input.rentAmountMinor,
      rentFrequency: input.rentFrequency,
      serviceChargeMinor: input.serviceChargeMinor,
      securityDepositMinor: input.securityDepositMinor,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      furnishedStatus: input.furnishedStatus,
      availableDate: input.availableDate,
      amenities: input.amenities,
      rules: input.rules || null,
      imageUrls: input.imageUrls,
      videoUrls: input.videoUrls,
      displayArea: input.displayArea || null,
      viewingAvailabilityNotes: input.viewingAvailabilityNotes || null,
      status: "DRAFT",
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.listing.created",
    entityType: "RentalListing",
    entityId: listing.id,
    after: listing,
  });

  return listing;
}

async function transitionListing(actor: CurrentUser, listingId: string, next: "AVAILABLE" | "WITHDRAWN", timestampField?: "publishedAt" | "withdrawnAt") {
  const listing = await prisma.rentalListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);

  const updated = await prisma.rentalListing.update({
    where: { id: listingId },
    data: { status: next, ...(timestampField ? { [timestampField]: new Date() } : {}) },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: `tenant_management.listing.${next.toLowerCase()}`,
    entityType: "RentalListing",
    entityId: listingId,
    before: listing,
    after: updated,
  });

  return updated;
}

export async function publishListing(actor: CurrentUser, listingId: string) {
  return transitionListing(actor, listingId, "AVAILABLE", "publishedAt");
}

/** Never automatic — a manager explicitly withdraws a listing (e.g. unit taken off-market, or leased through another channel). */
export async function withdrawListing(actor: CurrentUser, listingId: string) {
  return transitionListing(actor, listingId, "WITHDRAWN", "withdrawnAt");
}

export async function openApplications(actor: CurrentUser, listingId: string) {
  const listing = await prisma.rentalListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);
  return prisma.rentalListing.update({ where: { id: listingId }, data: { status: "APPLICATIONS_OPEN" } });
}

export async function listAccessibleListings(propertyIds: string[] | "all") {
  return prisma.rentalListing.findMany({
    where: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } },
    include: {
      unit: { include: { property: true } },
      _count: { select: { inquiries: true, viewings: true, applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getListingDetail(actor: CurrentUser, listingId: string) {
  const listing = await prisma.rentalListing.findUnique({
    where: { id: listingId },
    include: { unit: { include: { property: true } } },
  });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);
  return listing;
}

// --- Public marketplace -----------------------------------------------------

export interface MarketplaceFilters {
  state?: string;
  city?: string;
  minRentMinor?: number;
  maxRentMinor?: number;
  bedrooms?: number;
  propertyType?: string;
  furnishedStatus?: string;
  availableFrom?: Date;
}

/** Scoped to NidraQ-managed inventory only (AVAILABLE/APPLICATIONS_OPEN listings) — never a general classifieds feed. */
export async function searchPublicListings(filters: MarketplaceFilters) {
  return prisma.rentalListing.findMany({
    where: {
      status: { in: ["AVAILABLE", "APPLICATIONS_OPEN"] },
      rentAmountMinor: {
        gte: filters.minRentMinor ?? undefined,
        lte: filters.maxRentMinor ?? undefined,
      },
      bedrooms: filters.bedrooms ?? undefined,
      furnishedStatus: (filters.furnishedStatus as never) ?? undefined,
      availableDate: filters.availableFrom ? { lte: filters.availableFrom } : undefined,
      unit: {
        property: {
          city: filters.city ? { equals: filters.city, mode: "insensitive" } : undefined,
          state: filters.state ? { equals: filters.state, mode: "insensitive" } : undefined,
          propertyType: (filters.propertyType as never) ?? undefined,
        },
      },
    },
    select: PUBLIC_LISTING_SELECT,
    orderBy: { publishedAt: "desc" },
  });
}

export async function getPublicListingByReference(listingReference: string) {
  const listing = await prisma.rentalListing.findUnique({
    where: { listingReference },
    select: { ...PUBLIC_LISTING_SELECT, id: true },
  });
  if (!listing || !["AVAILABLE", "APPLICATIONS_OPEN", "UNDER_OFFER", "RESERVED"].includes(listing.status)) {
    throw new NotFoundError("Listing");
  }
  return listing;
}

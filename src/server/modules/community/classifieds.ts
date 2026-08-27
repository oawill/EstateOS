import { Prisma, type ClassifiedCondition, type ClassifiedListingStatus, type ListingContactMethod } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getOrCreateCommunitySettings } from "./settings";

const listingWithRelations = Prisma.validator<Prisma.ClassifiedListingDefaultArgs>()({
  include: {
    category: true,
    images: { orderBy: { sortOrder: "asc" } },
    seller: { include: { occupancies: true, user: { include: { memberships: true } } } },
  },
});
export type ClassifiedListingWithRelations = Prisma.ClassifiedListingGetPayload<typeof listingWithRelations>;

export interface CreateListingInput {
  categoryId: string;
  title: string;
  description: string;
  priceKobo?: number;
  currency?: string;
  negotiable?: boolean;
  condition?: ClassifiedCondition;
  locationNote?: string;
  contactMethods: ListingContactMethod[];
  whatsappNumber?: string;
  phoneNumber?: string;
  expiresAt?: Date;
  imageUrls?: string[];
  nightlyRateKobo?: number;
  bedrooms?: number;
  maxGuests?: number;
  amenities?: string[];
  availableFrom?: Date;
  availableTo?: Date;
}

export async function createListing(estateId: string, sellerResidentId: string, input: CreateListingInput) {
  const seller = await scoped(estateId).resident.findById(sellerResidentId);
  if (!seller) throw new NotFoundError("Resident");
  if (seller.communitySuspendedAt) throw new ForbiddenError("Your community posting privileges have been suspended.");

  const category = await scoped(estateId).classifiedCategory.findById(input.categoryId);
  if (!category) throw new NotFoundError("Category");

  const settings = await getOrCreateCommunitySettings(estateId);
  const approvedAt = settings.listingsRequireApproval ? null : new Date();

  return prisma.$transaction(async (tx) => {
    const listing = await tx.classifiedListing.create({
      data: {
        estateId,
        sellerResidentId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        priceKobo: input.priceKobo,
        currency: input.currency ?? "NGN",
        negotiable: input.negotiable ?? false,
        condition: input.condition,
        locationNote: input.locationNote,
        contactMethods: input.contactMethods,
        whatsappNumber: input.whatsappNumber,
        phoneNumber: input.phoneNumber,
        expiresAt: input.expiresAt,
        approvedAt,
        nightlyRateKobo: input.nightlyRateKobo,
        bedrooms: input.bedrooms,
        maxGuests: input.maxGuests,
        amenities: input.amenities ?? [],
        availableFrom: input.availableFrom,
        availableTo: input.availableTo,
      },
    });

    if (input.imageUrls?.length) {
      await tx.classifiedImage.createMany({
        data: input.imageUrls.map((url, index) => ({ estateId, listingId: listing.id, url, sortOrder: index })),
      });
    }

    return listing;
  });
}

export interface ListingFilters {
  keyword?: string;
  categoryKey?: string;
  minPriceKobo?: number;
  maxPriceKobo?: number;
  status?: ClassifiedListingStatus;
  sort?: "newest" | "updated";
}

export async function listListings(estateId: string, filters: ListingFilters = {}) {
  const where: Prisma.ClassifiedListingWhereInput = {
    moderationStatus: "VISIBLE",
    status: filters.status ?? "ACTIVE",
    approvedAt: { not: null },
  };

  if (filters.keyword) {
    where.OR = [
      { title: { contains: filters.keyword, mode: "insensitive" } },
      { description: { contains: filters.keyword, mode: "insensitive" } },
    ];
  }
  if (filters.categoryKey) {
    where.category = { key: filters.categoryKey };
  }
  if (filters.minPriceKobo !== undefined || filters.maxPriceKobo !== undefined) {
    where.priceKobo = {
      gte: filters.minPriceKobo,
      lte: filters.maxPriceKobo,
    };
  }

  return scoped(estateId).classifiedListing.findMany<ClassifiedListingWithRelations>({
    where,
    orderBy: { [filters.sort === "updated" ? "updatedAt" : "createdAt"]: "desc" },
    include: listingWithRelations.include,
  });
}

export async function getListing(estateId: string, listingId: string) {
  const listing = await scoped(estateId).classifiedListing.findById<ClassifiedListingWithRelations>(listingId, {
    include: listingWithRelations.include,
  });
  if (!listing || listing.moderationStatus !== "VISIBLE") throw new NotFoundError("Listing");
  return listing;
}

export async function listMyListings(estateId: string, sellerResidentId: string) {
  return scoped(estateId).classifiedListing.findMany<ClassifiedListingWithRelations>({
    where: { sellerResidentId },
    orderBy: { createdAt: "desc" },
    include: listingWithRelations.include,
  });
}

export async function updateListingStatus(estateId: string, sellerResidentId: string, listingId: string, status: ClassifiedListingStatus) {
  const listing = await scoped(estateId).classifiedListing.findById(listingId);
  if (!listing) throw new NotFoundError("Listing");
  if (listing.sellerResidentId !== sellerResidentId) throw new ForbiddenError("Only the seller can update this listing.");

  return scoped(estateId).classifiedListing.update(listingId, { status });
}

export async function toggleSavedListing(estateId: string, residentId: string, listingId: string) {
  const listing = await scoped(estateId).classifiedListing.findById(listingId);
  if (!listing) throw new NotFoundError("Listing");

  const existing = await prisma.communitySavedListing.findUnique({ where: { residentId_listingId: { residentId, listingId } } });
  if (existing) {
    await prisma.communitySavedListing.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await scoped(estateId).communitySavedListing.create({ residentId, listingId });
  return { saved: true };
}

export async function listSavedListings(estateId: string, residentId: string) {
  const saved = await scoped(estateId).communitySavedListing.findMany({ where: { residentId }, orderBy: { createdAt: "desc" } });
  const listingIds = saved.map((s) => s.listingId);
  if (listingIds.length === 0) return [];

  const listings = await scoped(estateId).classifiedListing.findMany<ClassifiedListingWithRelations>({
    where: { id: { in: listingIds } },
    include: listingWithRelations.include,
  });
  const byId = new Map(listings.map((l) => [l.id, l]));
  return listingIds.map((id) => byId.get(id)).filter((l): l is ClassifiedListingWithRelations => Boolean(l));
}

export async function createListingInquiry(estateId: string, buyerResidentId: string, listingId: string, message: string) {
  const listing = await scoped(estateId).classifiedListing.findById(listingId);
  if (!listing) throw new NotFoundError("Listing");

  return scoped(estateId).listingInquiry.create({ listingId, buyerResidentId, message });
}

export async function listInquiriesForListing(estateId: string, sellerResidentId: string, listingId: string) {
  const listing = await scoped(estateId).classifiedListing.findById(listingId);
  if (!listing) throw new NotFoundError("Listing");
  if (listing.sellerResidentId !== sellerResidentId) throw new ForbiddenError("Only the seller can view inquiries.");

  return prisma.listingInquiry.findMany({
    where: { listingId },
    orderBy: { createdAt: "desc" },
    include: { buyer: true },
  });
}

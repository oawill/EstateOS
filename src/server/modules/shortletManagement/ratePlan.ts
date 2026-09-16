import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import type { CreateRatePlanInput } from "./schema";

export async function createRatePlan(actor: CurrentUser, input: CreateRatePlanInput) {
  const listing = await prisma.shortletListing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);

  const ratePlan = await prisma.ratePlan.create({
    data: {
      listingId: input.listingId,
      type: input.type,
      label: input.label || null,
      startDate: input.startDate,
      endDate: input.endDate,
      daysOfWeek: input.daysOfWeek,
      nightlyRateMinor: input.nightlyRateMinor,
      minStayNights: input.minStayNights,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.rate_plan.created",
    entityType: "RatePlan",
    entityId: ratePlan.id,
    after: ratePlan,
  });

  return ratePlan;
}

export async function deleteRatePlan(actor: CurrentUser, ratePlanId: string) {
  const ratePlan = await prisma.ratePlan.findUnique({ where: { id: ratePlanId }, include: { listing: true } });
  if (!ratePlan) throw new NotFoundError("Rate plan");
  await assertPropertyAccess(actor, ratePlan.listing.propertyId);
  await prisma.ratePlan.delete({ where: { id: ratePlanId } });
}

/**
 * Resolves the nightly rate that applies to one specific calendar date,
 * checking rate plans in priority order (a specific date beats a season,
 * a season beats a recurring weekend rate) and falling back to the
 * listing's own baseNightlyRateMinor. Never retroactive — a booking
 * snapshots whatever this returns at the moment it's created (see
 * booking.ts), so changing rate plans later never rewrites a past
 * booking's price.
 */
export function resolveNightlyRateForDate(
  date: Date,
  baseNightlyRateMinor: number,
  ratePlans: { type: string; startDate: Date | null; endDate: Date | null; daysOfWeek: number[]; nightlyRateMinor: number }[],
): number {
  const dateSpecific = ratePlans.find(
    (r) => r.type === "DATE_SPECIFIC" && r.startDate && r.endDate && date >= r.startDate && date < r.endDate,
  );
  if (dateSpecific) return dateSpecific.nightlyRateMinor;

  const seasonal = ratePlans.find(
    (r) => r.type === "SEASONAL" && r.startDate && r.endDate && date >= r.startDate && date < r.endDate,
  );
  if (seasonal) return seasonal.nightlyRateMinor;

  const weekend = ratePlans.find((r) => r.type === "WEEKEND" && r.daysOfWeek.includes(date.getUTCDay()));
  if (weekend) return weekend.nightlyRateMinor;

  return baseNightlyRateMinor;
}

export function calculateAccommodationTotal(
  checkInDate: Date,
  checkOutDate: Date,
  baseNightlyRateMinor: number,
  ratePlans: { type: string; startDate: Date | null; endDate: Date | null; daysOfWeek: number[]; nightlyRateMinor: number }[],
): { totalMinor: number; nights: number; averageNightlyRateMinor: number } {
  let cursor = new Date(checkInDate);
  let totalMinor = 0;
  let nights = 0;

  while (cursor < checkOutDate) {
    totalMinor += resolveNightlyRateForDate(cursor, baseNightlyRateMinor, ratePlans);
    nights += 1;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return { totalMinor, nights, averageNightlyRateMinor: nights > 0 ? Math.round(totalMinor / nights) : baseNightlyRateMinor };
}

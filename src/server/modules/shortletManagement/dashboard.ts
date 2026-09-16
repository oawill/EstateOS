import type { ShortletBookingStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { CurrentUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "./access";
import { ACTIVE_BOOKING_STATUSES } from "./availability";

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
function startOfNextMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}
function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Nights of a [checkIn, checkOut) stay that fall within [rangeStart, rangeEnd) — clips a booking spanning a month boundary down to just that month's share. */
function nightsWithinRange(checkIn: Date, checkOut: Date, rangeStart: Date, rangeEnd: Date): number {
  const start = checkIn > rangeStart ? checkIn : rangeStart;
  const end = checkOut < rangeEnd ? checkOut : rangeEnd;
  const ms = end.getTime() - start.getTime();
  return ms > 0 ? Math.round(ms / 86_400_000) : 0;
}

const REVENUE_COUNTING_STATUSES: ShortletBookingStatus[] = [...ACTIVE_BOOKING_STATUSES, "CHECKED_OUT", "COMPLETED"];

/**
 * Powers the /dashboard/shortlets command-center home. Every number here is
 * derived from real ShortletListing/ShortletBooking rows — nothing is
 * fabricated when a portfolio has no history yet (an empty portfolio just
 * yields zeros/nulls, which the UI renders as an empty state instead of a
 * misleading 0%).
 */
export async function getShortletHomeDashboard(user: CurrentUser, now: Date = new Date()) {
  const propertyIds = await getAuthorizedPropertyIds(user);
  const listingWhere = propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } };

  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);
  const lastMonthStart = startOfMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const soonCutoff = new Date(today.getTime() + 3 * 86_400_000);

  const [listings, thisMonthBookings, lastMonthBookings, arrivalsToday, departuresToday, stayingNow, outstandingSoon] =
    await Promise.all([
      prisma.shortletListing.findMany({
        where: listingWhere,
        include: { property: true, unit: true },
      }),
      prisma.shortletBooking.findMany({
        where: {
          listing: listingWhere,
          status: { in: REVENUE_COUNTING_STATUSES },
          checkInDate: { lt: nextMonthStart },
          checkOutDate: { gt: monthStart },
        },
        select: { checkInDate: true, checkOutDate: true, totalAmountMinor: true, securityDepositMinor: true },
      }),
      prisma.shortletBooking.findMany({
        where: {
          listing: listingWhere,
          status: { in: REVENUE_COUNTING_STATUSES },
          checkInDate: { lt: monthStart },
          checkOutDate: { gt: lastMonthStart },
        },
        select: { totalAmountMinor: true },
      }),
      prisma.shortletBooking.findMany({
        where: { listing: listingWhere, status: { in: ACTIVE_BOOKING_STATUSES }, checkInDate: { gte: today, lt: tomorrow } },
        include: { guest: true, listing: { include: { property: true, unit: true } } },
        orderBy: { checkInDate: "asc" },
      }),
      prisma.shortletBooking.findMany({
        where: { listing: listingWhere, status: "CHECKED_IN", checkOutDate: { gte: today, lt: tomorrow } },
        include: { guest: true, listing: { include: { property: true, unit: true } } },
        orderBy: { checkOutDate: "asc" },
      }),
      prisma.shortletBooking.findMany({
        where: { listing: listingWhere, status: "CHECKED_IN" },
        include: { guest: true, listing: { include: { property: true, unit: true } } },
      }),
      prisma.shortletBooking.findMany({
        where: {
          listing: listingWhere,
          status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"] },
          checkInDate: { gte: today, lt: soonCutoff },
        },
        include: { guest: true, listing: { include: { property: true, unit: true } } },
        orderBy: { checkInDate: "asc" },
      }),
    ]);

  const activeListings = listings.filter((l) => l.status === "ACTIVE");

  // A booking spanning the month boundary counts only its prorated share
  // toward this month's revenue (by nights actually falling in-month).
  const revenueThisMonthMinor = thisMonthBookings.reduce((sum, b) => {
    const totalNights = Math.max(1, Math.round((b.checkOutDate.getTime() - b.checkInDate.getTime()) / 86_400_000));
    const nightsInMonth = nightsWithinRange(b.checkInDate, b.checkOutDate, monthStart, nextMonthStart);
    return sum + Math.round(b.totalAmountMinor * (nightsInMonth / totalNights));
  }, 0);
  const revenueLastMonthMinor = lastMonthBookings.reduce((sum, b) => sum + b.totalAmountMinor, 0);
  const revenueDeltaPercent = revenueLastMonthMinor > 0 ? Math.round(((revenueThisMonthMinor - revenueLastMonthMinor) / revenueLastMonthMinor) * 100) : null;

  const nightsInMonth = Math.round((nextMonthStart.getTime() - monthStart.getTime()) / 86_400_000);
  const totalAvailableNights = activeListings.length * nightsInMonth;
  const bookedNightsThisMonth = thisMonthBookings.reduce((sum, b) => sum + nightsWithinRange(b.checkInDate, b.checkOutDate, monthStart, nextMonthStart), 0);
  const occupancyRate = totalAvailableNights > 0 ? Math.round((bookedNightsThisMonth / totalAvailableNights) * 100) : null;
  const availableNights = Math.max(totalAvailableNights - bookedNightsThisMonth, 0);

  const averageNightlyRateMinor = thisMonthBookings.length > 0
    ? Math.round(thisMonthBookings.reduce((sum, b) => sum + b.totalAmountMinor, 0) / Math.max(1, bookedNightsThisMonth))
    : null;

  // "Needs attention" — only ever built from real, currently-true facts:
  // a booking arriving soon that hasn't been fully paid, or one that's
  // still sitting unconfirmed as arrival approaches. Turnover/maintenance/
  // deposit-review items are deliberately omitted until those subsystems
  // exist — see the completion notes.
  const paymentOutstanding = outstandingSoon.filter((b) => b.amountPaidMinor < b.totalAmountMinor);
  const awaitingConfirmation = outstandingSoon.filter((b) => ["PENDING", "AWAITING_PAYMENT"].includes(b.status));

  const propertyPerformance = await Promise.all(
    listings.map(async (listing) => {
      const [monthBookings, upcomingCount, occupiedTonight, nextBooking] = await Promise.all([
        prisma.shortletBooking.findMany({
          where: {
            listingId: listing.id,
            status: { in: REVENUE_COUNTING_STATUSES },
            checkInDate: { lt: nextMonthStart },
            checkOutDate: { gt: monthStart },
          },
          select: { checkInDate: true, checkOutDate: true, totalAmountMinor: true },
        }),
        prisma.shortletBooking.count({
          where: { listingId: listing.id, status: { in: ["CONFIRMED", "PENDING", "AWAITING_PAYMENT"] }, checkInDate: { gte: today } },
        }),
        prisma.shortletBooking.findFirst({
          where: { listingId: listing.id, status: { in: ["CONFIRMED", "CHECKED_IN"] }, checkInDate: { lte: today }, checkOutDate: { gt: today } },
        }),
        prisma.shortletBooking.findFirst({
          where: { listingId: listing.id, status: { in: ["CONFIRMED", "PENDING", "AWAITING_PAYMENT"] }, checkInDate: { gte: today } },
          orderBy: { checkInDate: "asc" },
          include: { guest: true },
        }),
      ]);

      const propRevenueMinor = monthBookings.reduce((sum, b) => sum + b.totalAmountMinor, 0);
      const propNights = monthBookings.reduce((sum, b) => sum + nightsWithinRange(b.checkInDate, b.checkOutDate, monthStart, nextMonthStart), 0);
      const propOccupancy = listing.status === "ACTIVE" ? Math.round((propNights / nightsInMonth) * 100) : null;

      return {
        listing,
        revenueThisMonthMinor: propRevenueMinor,
        occupancyRate: propOccupancy,
        upcomingBookingsCount: upcomingCount,
        occupiedTonight: Boolean(occupiedTonight),
        nextBooking,
      };
    }),
  );

  return {
    kpis: {
      revenueThisMonthMinor: Math.round(revenueThisMonthMinor),
      revenueDeltaPercent,
      occupancyRate,
      bookingsThisMonth: thisMonthBookings.length,
      averageNightlyRateMinor,
      availableNights,
    },
    today: {
      arrivals: arrivalsToday,
      departures: departuresToday,
      staying: stayingNow,
    },
    needsAttention: {
      paymentOutstanding,
      awaitingConfirmation,
    },
    properties: propertyPerformance,
  };
}

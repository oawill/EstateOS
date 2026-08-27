import { ReservationStatus, ShortletPropertyStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { outstandingAmountMinor } from "./reservations";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

const OCCUPYING_STATUSES: ReservationStatus[] = [ReservationStatus.CHECKED_IN];
const UPCOMING_STATUSES: ReservationStatus[] = [ReservationStatus.PENDING, ReservationStatus.CONFIRMED];

export async function getShortletDashboardSummary(estateId: string, now = new Date()) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  const [totalProperties, totalUnits, unavailableUnits, arrivalsToday, departuresToday, currentGuests, upcoming, unpaidReservations, reservationsThisMonth] =
    await Promise.all([
      prisma.shortletProperty.count({ where: { estateId } }),
      prisma.shortletUnit.count({ where: { estateId } }),
      prisma.shortletUnit.count({ where: { estateId, status: { not: ShortletPropertyStatus.ACTIVE } } }),
      prisma.reservation.count({
        where: { estateId, status: ReservationStatus.CONFIRMED, checkInDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.reservation.count({
        where: { estateId, status: ReservationStatus.CHECKED_IN, checkOutDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.reservation.count({ where: { estateId, status: { in: OCCUPYING_STATUSES } } }),
      prisma.reservation.findMany({
        where: { estateId, status: { in: UPCOMING_STATUSES }, checkInDate: { gt: todayEnd } },
        orderBy: { checkInDate: "asc" },
        take: 5,
        include: { unit: { include: { property: true } }, guest: true },
      }),
      prisma.reservation.findMany({
        where: { estateId, status: { in: [...OCCUPYING_STATUSES, ...UPCOMING_STATUSES] } },
        select: { totalAmountMinor: true, amountPaidMinor: true },
      }),
      prisma.reservation.findMany({
        where: { estateId, checkInDate: { gte: monthStart, lte: todayEnd } },
        select: { totalAmountMinor: true, amountPaidMinor: true, checkInDate: true },
      }),
    ]);

  const availableUnits = totalUnits - unavailableUnits - currentGuests;
  const outstandingTotalMinor = unpaidReservations.reduce((sum, r) => sum + outstandingAmountMinor(r), 0);
  const revenueThisMonthMinor = reservationsThisMonth.reduce((sum, r) => sum + r.amountPaidMinor, 0);
  const revenueTodayMinor = reservationsThisMonth
    .filter((r) => r.checkInDate >= todayStart && r.checkInDate <= todayEnd)
    .reduce((sum, r) => sum + r.amountPaidMinor, 0);

  return {
    totalProperties,
    totalUnits,
    availableUnits: Math.max(availableUnits, 0),
    occupiedUnits: currentGuests,
    arrivalsToday,
    departuresToday,
    currentGuests,
    upcomingReservations: upcoming,
    revenueTodayMinor,
    revenueThisMonthMinor,
    outstandingTotalMinor,
    propertiesNotReady: unavailableUnits,
  };
}

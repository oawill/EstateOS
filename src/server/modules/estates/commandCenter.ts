import { prisma } from "@/server/db/client";
import { getFinanceSummary, listPendingManualPayments } from "@/server/modules/billing/service";
import { getMaintenanceSummary } from "@/server/modules/maintenance/service";
import { countCurrentlyCheckedIn, listExpectedToday, countAwaitingApproval } from "@/server/modules/visitors/service";
import { listIncidents } from "@/server/modules/security/incidents";
import { listReports } from "@/server/modules/community/moderation";
import { listAnnouncements } from "@/server/modules/announcements/service";
import { getEstateLocale } from "@/server/modules/estates/service";

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  href: string;
  urgency: "high" | "medium" | "low";
}

/**
 * The Estate Command Center's single aggregation pass — every number here
 * comes from a real, already-authoritative service (billing, maintenance,
 * visitors, security, community), never a duplicate calculation. This is
 * deliberately the one place that assembles them together for the
 * dashboard; each individual number's source of truth still lives in its
 * own module.
 */
export async function getCommandCenterOverview(estateId: string) {
  const estateLocale = await getEstateLocale(estateId);

  const [
    finance,
    maintenance,
    propertyCount,
    unitCount,
    occupiedUnits,
    residentCount,
    checkedInCount,
    expectedToday,
    awaitingApprovalCount,
    openIncidents,
    pendingPayments,
    openReports,
    recentAnnouncements,
  ] = await Promise.all([
    getFinanceSummary(estateId),
    getMaintenanceSummary(estateId),
    prisma.property.count({ where: { estateId } }),
    prisma.unit.count({ where: { estateId } }),
    prisma.unit.count({ where: { estateId, occupancyStatus: "OCCUPIED" } }),
    prisma.resident.count({ where: { estateId } }),
    countCurrentlyCheckedIn(estateId),
    listExpectedToday(estateId, estateLocale.timezone),
    countAwaitingApproval(estateId),
    listIncidents(estateId, { status: "OPEN" }),
    listPendingManualPayments(estateId),
    listReports(estateId, { status: "OPEN" }),
    listAnnouncements(estateId),
  ]);

  const money = (kobo: number) =>
    new Intl.NumberFormat(estateLocale.locale, { style: "currency", currency: estateLocale.currency, maximumFractionDigits: 0 }).format(kobo / 100);

  const collectedPlusOutstanding = finance.collectionsThisMonthKobo + finance.outstandingKobo;
  const collectionRate = collectedPlusOutstanding > 0 ? Math.round((finance.collectionsThisMonthKobo / collectedPlusOutstanding) * 100) : null;

  const attention: AttentionItem[] = [];

  if (finance.overdueCount > 0) {
    attention.push({
      id: "overdue-invoices",
      title: `${finance.overdueCount} Overdue Service Charge${finance.overdueCount === 1 ? "" : "s"}`,
      detail: `Total outstanding: ${money(finance.outstandingKobo)}`,
      ctaLabel: "Review Accounts",
      href: "billing",
      urgency: "high",
    });
  }

  if (maintenance.overdueCount > 0) {
    attention.push({
      id: "overdue-maintenance",
      title: `${maintenance.overdueCount} Overdue Maintenance Request${maintenance.overdueCount === 1 ? "" : "s"}`,
      detail: `${maintenance.openCount} open in total`,
      ctaLabel: "Review Maintenance",
      href: "facility",
      urgency: "high",
    });
  }

  if (openIncidents.length > 0) {
    const latest = openIncidents[0];
    attention.push({
      id: "open-incidents",
      title: `${openIncidents.length} Open Security Incident${openIncidents.length === 1 ? "" : "s"}`,
      detail: `Latest: ${latest.category.replaceAll("_", " ")}`,
      ctaLabel: "Review Incident",
      href: "gate/incidents",
      urgency: "high",
    });
  }

  if (pendingPayments.length > 0) {
    attention.push({
      id: "pending-payments",
      title: `${pendingPayments.length} Payment${pendingPayments.length === 1 ? "" : "s"} Awaiting Confirmation`,
      detail: "Resident-reported bank transfers not yet confirmed",
      ctaLabel: "Review Payments",
      href: "billing",
      urgency: "medium",
    });
  }

  if (awaitingApprovalCount > 0) {
    attention.push({
      id: "awaiting-visitor-approval",
      title: `${awaitingApprovalCount} Walk-In Visitor${awaitingApprovalCount === 1 ? "" : "s"} Awaiting Approval`,
      detail: "Waiting on the host resident's decision",
      ctaLabel: "Open Gate",
      href: "gate",
      urgency: "medium",
    });
  }

  if (openReports.length > 0) {
    attention.push({
      id: "community-reports",
      title: `${openReports.length} Community Report${openReports.length === 1 ? "" : "s"} Awaiting Review`,
      detail: "Flagged posts, comments or listings",
      ctaLabel: "Review Community",
      href: "community/moderation",
      urgency: "low",
    });
  }

  return {
    kpis: {
      collectedThisMonthKobo: finance.collectionsThisMonthKobo,
      outstandingKobo: finance.outstandingKobo,
      occupiedUnits,
      unitCount,
      openRequests: maintenance.openCount,
      visitorsToday: expectedToday.length,
      openIncidents: openIncidents.length,
    },
    finance: { ...finance, collectionRate },
    today: {
      expectedVisitors: expectedToday.length,
      currentlyInside: checkedInCount,
      openMaintenance: maintenance.openCount,
    },
    security: {
      expectedVisitors: expectedToday.length,
      currentlyInside: checkedInCount,
      awaitingApproval: awaitingApprovalCount,
      openIncidents: openIncidents.length,
    },
    residents: { propertyCount, unitCount, occupiedUnits, vacantUnits: unitCount - occupiedUnits, residentCount },
    attention: attention.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]),
    recentAnnouncements: recentAnnouncements.slice(0, 2),
  };
}

const URGENCY_RANK: Record<AttentionItem["urgency"], number> = { high: 0, medium: 1, low: 2 };

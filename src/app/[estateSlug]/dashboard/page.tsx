import Link from "next/link";
import { Role } from "@prisma/client";
import { Badge, Button, Card } from "@/components/shared/ui";
import { KpiCard, type KpiTone } from "@/components/shared/KpiCard";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { formatMoney } from "@/lib/utils";
import { getFinanceSummary, getResidentOutstandingBalanceKobo } from "@/server/modules/billing/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { countCurrentlyCheckedIn } from "@/server/modules/visitors/service";
import { getMaintenanceSummary } from "@/server/modules/maintenance/service";
import { countUnreadNotifications } from "@/server/modules/announcements/service";

interface EstateLocale {
  currency: string;
  locale: string;
}

async function AdminOverview({ estateId, estateLocale }: { estateId: string; estateLocale: EstateLocale }) {
  const [propertyCount, unitCount, residentCount, occupiedUnits, financeSummary, checkedInCount, maintenanceSummary] =
    await Promise.all([
      prisma.property.count({ where: { estateId } }),
      prisma.unit.count({ where: { estateId } }),
      prisma.resident.count({ where: { estateId } }),
      prisma.unit.count({ where: { estateId, occupancyStatus: "OCCUPIED" } }),
      getFinanceSummary(estateId),
      countCurrentlyCheckedIn(estateId),
      getMaintenanceSummary(estateId),
    ]);
  const money = (amountKobo: number) => formatMoney(amountKobo, estateLocale.currency, estateLocale.locale);

  const stats: { label: string; value: string | number; tone?: KpiTone }[] = [
    { label: "Properties", value: propertyCount },
    { label: "Units", value: unitCount },
    { label: "Occupied units", value: occupiedUnits },
    { label: "Registered residents", value: residentCount, tone: "gray" },
    { label: "Collected this month", value: money(financeSummary.collectionsThisMonthKobo), tone: "success" },
    { label: "Outstanding", value: money(financeSummary.outstandingKobo), tone: "warning" },
    { label: "Overdue invoices", value: financeSummary.overdueCount, tone: "danger" },
    { label: "Visitors currently inside", value: checkedInCount, tone: "gray" },
    { label: "Open maintenance tickets", value: maintenanceSummary.openCount, tone: "warning" },
    { label: "Overdue maintenance tickets", value: maintenanceSummary.overdueCount, tone: "danger" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <KpiCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
      ))}
    </div>
  );
}

async function FinanceOverview({ estateId, estateLocale }: { estateId: string; estateLocale: EstateLocale }) {
  const summary = await getFinanceSummary(estateId);
  const money = (amountKobo: number) => formatMoney(amountKobo, estateLocale.currency, estateLocale.locale);
  const stats: { label: string; value: string | number; tone: KpiTone }[] = [
    { label: "Collected today", value: money(summary.collectionsTodayKobo), tone: "success" },
    { label: "Collected this month", value: money(summary.collectionsThisMonthKobo), tone: "success" },
    { label: "Collected this year", value: money(summary.collectionsThisYearKobo), tone: "success" },
    { label: "Outstanding", value: money(summary.outstandingKobo), tone: "warning" },
    { label: "Overdue invoices", value: summary.overdueCount, tone: "danger" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((s) => (
        <KpiCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
      ))}
    </div>
  );
}

async function FacilityOverview({ estateId, estateSlug }: { estateId: string; estateSlug: string }) {
  const summary = await getMaintenanceSummary(estateId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard tone="warning" label="Open tickets" value={summary.openCount} />
        <KpiCard tone="danger" label="Overdue tickets" value={summary.overdueCount} />
      </div>
      <Link href={`/${estateSlug}/facility`}>
        <Button className="w-full">Open Facility</Button>
      </Link>
    </div>
  );
}

async function ResidentOverview({
  estateId,
  estateSlug,
  userId,
  estateLocale,
}: {
  estateId: string;
  estateSlug: string;
  userId: string;
  estateLocale: EstateLocale;
}) {
  const resident = await getResidentByUserId(estateId, userId);
  if (!resident) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Your resident profile isn&apos;t linked yet — contact your estate administrator.</p>
      </Card>
    );
  }

  const [outstandingKobo, unreadCount] = await Promise.all([
    getResidentOutstandingBalanceKobo(estateId, resident.id),
    countUnreadNotifications(estateId, resident.id),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-foreground-muted">Outstanding balance</p>
        <p className={`mt-1 text-3xl font-semibold ${outstandingKobo > 0 ? "text-warning" : "text-success"}`}>
          {formatMoney(outstandingKobo, estateLocale.currency, estateLocale.locale)}
        </p>
        <Link href={`/${estateSlug}/my/bills`}>
          <Button className="mt-4 w-full">{outstandingKobo > 0 ? "Pay now" : "View bills"}</Button>
        </Link>
      </Card>
      <Link href={`/${estateSlug}/notifications`}>
        <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
          <p className="text-sm text-foreground-muted">Notifications</p>
          {unreadCount > 0 ? <Badge tone="info">{unreadCount} new</Badge> : <Badge>Up to date</Badge>}
        </Card>
      </Link>
    </div>
  );
}

export default async function EstateDashboardPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstateMember(estateSlug));
  const estateLocale = await getEstateLocale(membership.estateId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Good day, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-foreground-muted">{membership.estateName}</p>
      </div>

      {membership.role === Role.ESTATE_ADMIN && (
        <AdminOverview estateId={membership.estateId} estateLocale={estateLocale} />
      )}

      {membership.role === Role.FINANCE && (
        <FinanceOverview estateId={membership.estateId} estateLocale={estateLocale} />
      )}

      {membership.role === Role.FACILITY_MANAGER && (
        <FacilityOverview estateId={membership.estateId} estateSlug={estateSlug} />
      )}

      {membership.role === Role.SECURITY && (
        <Card>
          <h2 className="font-medium">Gate Mode</h2>
          <p className="mt-1 text-sm text-slate-500">
            Verify visitor QR codes and PINs, and check visitors in/out. Security has no access to billing or
            resident financial data by design.
          </p>
          <Link href={`/${estateSlug}/gate`}>
            <Button className="mt-4 w-full">Open Gate Mode</Button>
          </Link>
        </Card>
      )}

      {membership.role === Role.RESIDENT && (
        <ResidentOverview
          estateId={membership.estateId}
          estateSlug={estateSlug}
          userId={user.id}
          estateLocale={estateLocale}
        />
      )}

      {membership.role === Role.VENDOR && (
        <Card>
          <h2 className="font-medium">My jobs</h2>
          <p className="mt-1 text-sm text-slate-500">Maintenance tickets assigned to you.</p>
          <Link href={`/${estateSlug}/jobs`}>
            <Button className="mt-4 w-full">View my jobs</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { Role } from "@prisma/client";
import { Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { formatNaira } from "@/lib/utils";
import { getFinanceSummary, getResidentOutstandingBalanceKobo } from "@/server/modules/billing/service";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { countCurrentlyCheckedIn } from "@/server/modules/visitors/service";
import { getMaintenanceSummary } from "@/server/modules/maintenance/service";

async function AdminOverview({ estateId }: { estateId: string }) {
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

  const stats = [
    { label: "Properties", value: propertyCount },
    { label: "Units", value: unitCount },
    { label: "Occupied units", value: occupiedUnits },
    { label: "Registered residents", value: residentCount },
    { label: "Collected this month", value: formatNaira(financeSummary.collectionsThisMonthKobo) },
    { label: "Outstanding", value: formatNaira(financeSummary.outstandingKobo) },
    { label: "Overdue invoices", value: financeSummary.overdueCount },
    { label: "Visitors currently inside", value: checkedInCount },
    { label: "Open maintenance tickets", value: maintenanceSummary.openCount },
    { label: "Overdue maintenance tickets", value: maintenanceSummary.overdueCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <p className="text-2xl font-semibold">{s.value}</p>
          <p className="mt-1 text-sm text-slate-500">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

async function FinanceOverview({ estateId }: { estateId: string }) {
  const summary = await getFinanceSummary(estateId);
  const stats = [
    { label: "Collected today", value: formatNaira(summary.collectionsTodayKobo) },
    { label: "Collected this month", value: formatNaira(summary.collectionsThisMonthKobo) },
    { label: "Collected this year", value: formatNaira(summary.collectionsThisYearKobo) },
    { label: "Outstanding", value: formatNaira(summary.outstandingKobo) },
    { label: "Overdue invoices", value: summary.overdueCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label}>
          <p className="text-xl font-semibold">{s.value}</p>
          <p className="mt-1 text-sm text-slate-500">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

async function FacilityOverview({ estateId, estateSlug }: { estateId: string; estateSlug: string }) {
  const summary = await getMaintenanceSummary(estateId);

  return (
    <Card>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-semibold">{summary.openCount}</p>
          <p className="mt-1 text-sm text-slate-500">Open tickets</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">{summary.overdueCount}</p>
          <p className="mt-1 text-sm text-slate-500">Overdue tickets</p>
        </div>
      </div>
      <Link href={`/${estateSlug}/facility`}>
        <Button className="mt-4 w-full">Open Facility</Button>
      </Link>
    </Card>
  );
}

async function ResidentOverview({ estateId, estateSlug, userId }: { estateId: string; estateSlug: string; userId: string }) {
  const resident = await getResidentByUserId(estateId, userId);
  if (!resident) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Your resident profile isn&apos;t linked yet — contact your estate administrator.</p>
      </Card>
    );
  }

  const outstandingKobo = await getResidentOutstandingBalanceKobo(estateId, resident.id);

  return (
    <Card>
      <p className="text-sm text-slate-500">Outstanding balance</p>
      <p className="mt-1 text-3xl font-semibold">{formatNaira(outstandingKobo)}</p>
      <Link href={`/${estateSlug}/my/bills`}>
        <Button className="mt-4 w-full">{outstandingKobo > 0 ? "Pay now" : "View bills"}</Button>
      </Link>
    </Card>
  );
}

export default async function EstateDashboardPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstateMember(estateSlug));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Good day, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">{membership.estateName}</p>
      </div>

      {membership.role === Role.ESTATE_ADMIN && <AdminOverview estateId={membership.estateId} />}

      {membership.role === Role.FINANCE && <FinanceOverview estateId={membership.estateId} />}

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
        <ResidentOverview estateId={membership.estateId} estateSlug={estateSlug} userId={user.id} />
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

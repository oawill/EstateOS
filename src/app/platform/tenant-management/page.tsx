import { KpiCard } from "@/components/shared/KpiCard";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { getPlatformOverviewCounts } from "@/server/modules/tenantManagement/platformAdmin";

export default async function PlatformTenantManagementOverviewPage() {
  await guardPage(() => requirePlatformAdmin());
  const counts = await getPlatformOverviewCounts();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KpiCard label="Landlords" value={counts.landlords} />
      <KpiCard label="Properties" value={counts.properties} />
      <KpiCard label="Rental units" value={counts.units} />
      <KpiCard label="Tenants" value={counts.tenants} />
      <KpiCard label="Active leases" value={counts.activeLeases} />
      <KpiCard label="Overdue rent obligations" value={counts.overdueObligations} tone="danger" />
      <KpiCard label="Open maintenance requests" value={counts.openMaintenance} tone="warning" />
    </div>
  );
}

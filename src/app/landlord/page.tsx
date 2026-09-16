import { Card, Badge } from "@/components/shared/ui";
import { KpiCard } from "@/components/shared/KpiCard";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { getDashboardKpis } from "@/server/modules/tenantManagement/dashboard";
import { listAccessibleProperties, getPayoutDetails } from "@/server/modules/tenantManagement/property";
import { listOwnerStatements } from "@/server/modules/tenantManagement/statements";
import { formatNaira } from "@/lib/utils";
import { StatementForm } from "./StatementForm";
import { PayoutDetailsForm } from "./PayoutDetailsForm";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function LandlordPortalPage() {
  const { user, ownerId } = await guardPage(async () => requirePropertyOwner(await requireUser()));
  const [kpis, properties, statements, payoutDetails] = await Promise.all([
    getDashboardKpis(user),
    listAccessibleProperties(user),
    listOwnerStatements(user, ownerId),
    getPayoutDetails(user, ownerId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-foreground-muted">Your portfolio at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Properties" value={kpis.totalProperties} />
        <KpiCard label="Occupancy" value={`${kpis.occupancyRate}%`} />
        <KpiCard label="Rent collected (month)" value={formatNaira(kpis.rentCollectedThisMonthMinor)} tone="success" />
        <KpiCard label="Outstanding rent" value={formatNaira(kpis.outstandingRentMinor)} tone="warning" />
        <KpiCard label="Active leases" value={kpis.activeLeases} />
        <KpiCard label="Leases expiring (90d)" value={kpis.leasesExpiring90} tone="warning" />
        <KpiCard label="Open maintenance" value={kpis.openMaintenanceCount} tone="warning" />
        <KpiCard label="Overdue rent" value={kpis.overdueObligationCount} tone="danger" />
        <KpiCard label="Collection rate (month)" value={`${kpis.collectionRate}%`} />
        <KpiCard label="Settlements due to you" value={formatNaira(kpis.landlordSettlementsDueMinor)} />
      </div>

      <Card>
        <p className="text-sm font-medium">Payout Details</p>
        <p className="mt-1 text-xs text-foreground-muted">Only visible to you — never shown in any property or tenant list.</p>
        <div className="mt-3">
          <PayoutDetailsForm ownerId={ownerId} current={payoutDetails} />
        </div>
      </Card>

      <Card>
        <p className="text-sm font-medium">Generate a Statement</p>
        <p className="mt-1 text-xs text-foreground-muted">
          Built from your actual rent payments and paid maintenance expenses for the selected period.
        </p>
        <div className="mt-3">
          <StatementForm properties={properties.map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Statements</h2>
        <div className="mt-3 space-y-3">
          {statements.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No statements generated yet.</p>
            </Card>
          )}
          {statements.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {MONTH_NAMES[s.periodMonth - 1]} {s.periodYear} {s.property ? `· ${s.property.name}` : "· All properties"}
                </p>
                <p className="text-sm text-foreground-muted">
                  Income {formatNaira(s.totalIncomeMinor)} · Expenses {formatNaira(s.totalExpenseMinor)}
                </p>
              </div>
              <Badge tone={s.netAmountMinor >= 0 ? "success" : "danger"}>Net {formatNaira(s.netAmountMinor)}</Badge>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Properties</h2>
        <div className="mt-3 space-y-3">
          {properties.map((p) => (
            <Card key={p.id}>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-foreground-muted">
                {p.addressLine}, {p.city} · {p.units.length} unit(s)
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { listAccessibleProperties } from "@/server/modules/tenantManagement/property";
import { getManagementAgreement, listOwnerSettlements } from "@/server/modules/tenantManagement/managementFee";
import { formatNaira } from "@/lib/utils";
import { ManagementAgreementForm, GenerateSettlementForm, SettlementStatusForm } from "./SettlementForms";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_TONE = { PENDING: "warning", APPROVED: "info", PROCESSING: "info", PAID: "success", FAILED: "danger", CANCELLED: "neutral" } as const;

export default async function SettlementsPage() {
  const { user, ownerId } = await guardPage(async () => requirePropertyOwner(await requireUser()));
  const properties = await listAccessibleProperties(user);
  const [agreements, settlements] = await Promise.all([
    Promise.all(properties.map((p) => getManagementAgreement(user, p.id))),
    listOwnerSettlements(user, ownerId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Management Fees &amp; Settlements</h1>
        <p className="text-sm text-foreground-muted">
          Set a management fee per property, then generate a settlement showing gross collections, the fee, expenses and the net amount owed to you — never deducted silently.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">Management fee per property</h2>
        <div className="mt-3 space-y-3">
          {properties.map((property, i) => (
            <Card key={property.id}>
              <p className="font-medium">{property.name}</p>
              <div className="mt-2">
                <ManagementAgreementForm propertyId={property.id} current={agreements[i]} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Generate a settlement</h2>
        <div className="mt-3">
          <GenerateSettlementForm ownerId={ownerId} properties={properties.map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      </Card>

      <div className="space-y-3">
        {settlements.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No settlements generated yet.</p>
          </Card>
        )}
        {settlements.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {MONTH_NAMES[s.periodStart.getUTCMonth()]} {s.periodStart.getUTCFullYear()} · {s.property ? s.property.name : "All properties"}
                </p>
                <p className="mt-1 text-sm text-foreground-muted">
                  Gross {formatNaira(s.grossCollectionsMinor)} − Management Fee {formatNaira(s.managementFeeMinor)} − Expenses{" "}
                  {formatNaira(s.expensesMinor)}
                </p>
              </div>
              <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
            </div>
            <p className="mt-2 text-lg font-semibold">Net: {formatNaira(s.netAmountMinor)}</p>
            <div className="mt-3 border-t border-border pt-3">
              <SettlementStatusForm settlementId={s.id} status={s.status} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

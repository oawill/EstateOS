import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAccessibleContext } from "@/server/modules/tenantManagement/access";
import { listAccessibleCharges } from "@/server/modules/tenantManagement/charges";
import { listAccessibleTenants } from "@/server/modules/tenantManagement/tenant";
import { listAccessibleProperties } from "@/server/modules/tenantManagement/property";
import { formatNaira, formatDate } from "@/lib/utils";
import { ChargeForm } from "./ChargeForm";

const STATUS_TONE = { PENDING: "warning", PARTIALLY_PAID: "warning", PAID: "success", WAIVED: "neutral", CANCELLED: "neutral" } as const;

export default async function ChargesPage() {
  const ctx = await guardPage(async () => getAccessibleContext(await requireUser()));
  const [charges, tenants, properties] = await Promise.all([
    listAccessibleCharges(ctx.user),
    listAccessibleTenants(ctx.user),
    listAccessibleProperties(ctx.user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Other Charges</h1>
        <p className="text-sm text-foreground-muted">Service charges, deposits, utilities, maintenance recharges and other one-off items — rent itself is tracked separately under Leases.</p>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Add a charge</h2>
        <div className="mt-3">
          <ChargeForm
            tenants={tenants.map((t) => ({
              id: t.id,
              fullName: t.fullName,
              propertyId: t.unit?.propertyId ?? null,
              unitId: t.unit?.id ?? null,
              leaseId: t.leases[0]?.id ?? null,
            }))}
            properties={properties.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {charges.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No charges recorded yet.</p>
          </Card>
        )}
        {charges.map((charge) => (
          <Card key={charge.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {charge.type.replaceAll("_", " ")} · {charge.tenant.fullName}
              </p>
              <p className="text-sm text-foreground-muted">
                {charge.property.name}
                {charge.unit ? ` · ${charge.unit.label}` : ""} · due {formatDate(charge.dueDate)}
              </p>
              <p className="mt-1 text-sm">{charge.description}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatNaira(charge.amountMinor)}</p>
              {charge.amountPaidMinor > 0 && (
                <p className="text-xs text-foreground-muted">{formatNaira(charge.amountPaidMinor)} paid</p>
              )}
              <Badge tone={STATUS_TONE[charge.status]}>{charge.status.replaceAll("_", " ")}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

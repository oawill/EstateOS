import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAccessibleContext } from "@/server/modules/tenantManagement/access";
import { listAccessibleTenants } from "@/server/modules/tenantManagement/tenant";
import { listVacantUnits } from "@/server/modules/tenantManagement/property";
import { formatNaira } from "@/lib/utils";
import { CreateTenantForm, CreateLeaseForm } from "./TenantForms";

export default async function TenantsPage() {
  const ctx = await guardPage(async () => getAccessibleContext(await requireUser()));
  const [tenants, vacantUnits] = await Promise.all([listAccessibleTenants(ctx.user), listVacantUnits(ctx.user)]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tenants</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium">Add a tenant</h2>
          <div className="mt-3">
            <CreateTenantForm />
          </div>
        </Card>
        <Card>
          <h2 className="text-sm font-medium">Create a lease</h2>
          <div className="mt-3">
            <CreateLeaseForm
              tenants={tenants.map((t) => ({ id: t.id, fullName: t.fullName }))}
              vacantUnits={vacantUnits.map((u) => ({
                id: u.id,
                label: u.label,
                propertyName: u.property.name,
                rentAmountMinor: u.rentAmountMinor,
                rentFrequency: u.rentFrequency,
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {tenants.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No tenants yet.</p>
          </Card>
        )}
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{tenant.fullName}</p>
              <p className="text-sm text-foreground-muted">
                {tenant.unit ? `${tenant.unit.property.name} · ${tenant.unit.label}` : "No unit assigned"}
              </p>
              {tenant.leases[0] && (
                <p className="text-xs text-foreground-muted">
                  Lease {tenant.leases[0].leaseCode} · {formatNaira(tenant.leases[0].rentAmountMinor)} /{" "}
                  {tenant.leases[0].paymentFrequency.toLowerCase()}
                </p>
              )}
            </div>
            <Badge
              tone={
                tenant.status === "ACTIVE"
                  ? "success"
                  : tenant.status === "NOTICE_GIVEN"
                    ? "warning"
                    : tenant.status === "FORMER"
                      ? "neutral"
                      : "info"
              }
            >
              {tenant.status.replaceAll("_", " ")}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

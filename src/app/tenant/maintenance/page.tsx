import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requireTenantSelf } from "@/server/modules/tenantManagement/access";
import { getTenantPortalData } from "@/server/modules/tenantManagement/tenant";
import { formatDate } from "@/lib/utils";
import { MaintenanceRequestForm } from "./MaintenanceRequestForm";

export default async function TenantMaintenancePage() {
  const { tenantId } = await guardPage(async () => requireTenantSelf(await requireUser()));
  const { tenant } = await getTenantPortalData(tenantId);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Maintenance</h1>

      {tenant.unit ? (
        <Card>
          <p className="text-sm font-medium">Report an issue</p>
          <div className="mt-3">
            <MaintenanceRequestForm propertyId={tenant.unit.propertyId} unitId={tenant.unit.id} />
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-foreground-muted">No unit assigned yet — contact your property manager.</p>
        </Card>
      )}

      <div className="space-y-3">
        {tenant.maintenanceRequests.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.category.replaceAll("_", " ")}</p>
                <p className="mt-1 text-sm text-foreground-muted">{r.description}</p>
                <p className="mt-1 text-xs text-foreground-muted">Submitted {formatDate(r.createdAt)}</p>
              </div>
              <Badge tone={r.status === "COMPLETED" || r.status === "CLOSED" ? "success" : "neutral"}>
                {r.status.replaceAll("_", " ")}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

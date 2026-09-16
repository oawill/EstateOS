import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listAccessibleMaintenanceRequests } from "@/server/modules/tenantManagement/maintenance";
import { formatNaira, formatDate } from "@/lib/utils";
import { StatusControls, ExpenseForm } from "./MaintenanceActions";

const PRIORITY_TONE = { LOW: "neutral", MEDIUM: "info", HIGH: "warning", URGENT: "danger" } as const;

export default async function MaintenancePage() {
  const propertyIds = await guardPage(async () => getAuthorizedPropertyIds(await requireUser()));
  const requests = await listAccessibleMaintenanceRequests(propertyIds);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Maintenance</h1>

      <div className="space-y-4">
        {requests.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No maintenance requests yet.</p>
          </Card>
        )}
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{request.category.replaceAll("_", " ")}</p>
                <p className="text-sm text-foreground-muted">
                  {request.property.name} · {request.unit.label} · {request.tenant?.fullName ?? "—"} · {request.requestCode}
                </p>
                <p className="mt-1 text-sm">{request.description}</p>
                <p className="mt-1 text-xs text-foreground-muted">Reported {formatDate(request.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={PRIORITY_TONE[request.priority]}>{request.priority}</Badge>
                <Badge tone={request.status === "COMPLETED" || request.status === "CLOSED" ? "success" : "neutral"}>
                  {request.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </div>

            {request.expenses.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                {request.expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <span className="text-foreground-muted">
                      {e.vendorName} — {e.description}
                    </span>
                    <span className="font-medium">{formatNaira(e.finalAmountMinor ?? e.approvedAmountMinor ?? e.estimateMinor ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-border pt-4">
              <StatusControls requestId={request.id} status={request.status} />
              <ExpenseForm requestId={request.id} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

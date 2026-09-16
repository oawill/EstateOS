import Link from "next/link";
import { RentalMaintenanceStatus } from "@prisma/client";
import { Badge, Button, Card, Select } from "@/components/shared/ui";
import { formatNaira, formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { searchMaintenanceRequests } from "@/server/modules/tenantManagement/platformAdmin";

export default async function PlatformMaintenancePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await guardPage(() => requirePlatformAdmin());
  const { status } = await searchParams;
  const parsedStatus = status && status in RentalMaintenanceStatus ? (status as RentalMaintenanceStatus) : undefined;
  const requests = await searchMaintenanceRequests(parsedStatus);

  return (
    <div className="space-y-4">
      <Card>
        <form method="get" className="flex gap-2">
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {Object.values(RentalMaintenanceStatus).map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {status && (
            <Link href="/platform/tenant-management/maintenance">
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          )}
        </form>
      </Card>

      <div className="space-y-3">
        {requests.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No maintenance requests match this filter.</p>
          </Card>
        )}
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {request.category.replaceAll("_", " ")} · {request.requestCode}
                </p>
                <p className="text-sm text-foreground-muted">
                  {request.property.name} · {request.unit.label} · Owner: {request.property.owner.name}
                </p>
                <p className="text-sm text-foreground-muted">
                  {request.tenant?.fullName ?? "—"} · reported {formatDate(request.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={request.priority === "URGENT" ? "danger" : request.priority === "HIGH" ? "warning" : "neutral"}>
                  {request.priority}
                </Badge>
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
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Card, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listAccessibleLeases, getExpiringLeases } from "@/server/modules/tenantManagement/lease";
import { formatNaira, formatDate } from "@/lib/utils";
import { NoticeButton, RenewLeaseForm } from "./LeaseActions";

export default async function LeasesPage() {
  const propertyIds = await guardPage(async () => getAuthorizedPropertyIds(await requireUser()));
  const [leases, expiring30] = await Promise.all([
    listAccessibleLeases(propertyIds),
    getExpiringLeases(propertyIds, 30),
  ]);
  const expiringIds = new Set(expiring30.map((l) => l.id));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Leases</h1>

      {expiring30.length > 0 && (
        <Card className="border-l-4 border-l-warning">
          <p className="text-sm font-medium">Expiring within 30 days</p>
          <p className="mt-1 text-sm text-foreground-muted">{expiring30.length} lease(s) need attention soon.</p>
        </Card>
      )}

      <div className="space-y-4">
        {leases.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No leases yet.</p>
          </Card>
        )}
        {leases.map((lease) => (
          <Card key={lease.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{lease.tenant.fullName}</p>
                <p className="text-sm text-foreground-muted">
                  {lease.unit.property.name} · {lease.unit.label} · {lease.leaseCode}
                </p>
                <p className="text-sm text-foreground-muted">
                  {formatDate(lease.startDate)} – {formatDate(lease.endDate)} · {formatNaira(lease.rentAmountMinor)} /{" "}
                  {lease.paymentFrequency.toLowerCase()}
                </p>
              </div>
              <Badge tone={expiringIds.has(lease.id) ? "warning" : lease.status === "ACTIVE" ? "success" : "neutral"}>
                {lease.status.replaceAll("_", " ")}
              </Badge>
            </div>

            {lease.status === "ACTIVE" || lease.status === "EXPIRING" ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <NoticeButton leaseId={lease.id} />
                <RenewLeaseForm leaseId={lease.id} currentRentMinor={lease.rentAmountMinor} currentFrequency={lease.paymentFrequency} />
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

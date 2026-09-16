import Link from "next/link";
import { Card, Badge, Button } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requireTenantSelf } from "@/server/modules/tenantManagement/access";
import { getTenantPortalData } from "@/server/modules/tenantManagement/tenant";
import { formatNaira, formatDate } from "@/lib/utils";

export default async function TenantPortalPage() {
  const { tenantId } = await guardPage(async () => requireTenantSelf(await requireUser()));
  const { tenant, currentLease, nextObligation, outstandingMinor } = await getTenantPortalData(tenantId);

  const openMaintenance = tenant.maintenanceRequests.filter((r) => r.status !== "COMPLETED" && r.status !== "CLOSED");

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">My Home</p>
        {tenant.unit ? (
          <>
            <p className="mt-1 text-lg font-semibold">{tenant.unit.property.name}</p>
            <p className="text-sm text-foreground-muted">
              Unit {tenant.unit.label} · {tenant.unit.property.addressLine}, {tenant.unit.property.city}
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Landlord: {tenant.unit.property.owner.name}
              {tenant.unit.property.owner.phone ? ` · ${tenant.unit.property.owner.phone}` : ""}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-foreground-muted">No unit assigned yet — contact your property manager.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Rent</p>
          <Badge tone={outstandingMinor > 0 ? "warning" : "success"}>{outstandingMinor > 0 ? "Balance due" : "Up to date"}</Badge>
        </div>
        <p className={`mt-2 text-2xl font-semibold ${outstandingMinor > 0 ? "text-warning" : "text-success"}`}>
          {formatNaira(outstandingMinor)}
        </p>
        {nextObligation && (
          <p className="text-xs text-foreground-muted">Next due {formatDate(nextObligation.dueDate)}</p>
        )}
        <p className="mt-3 text-xs text-foreground-muted">
          Manual bank transfer / cash payments recorded by your landlord or manager will appear here automatically.
        </p>
      </Card>

      {currentLease && (
        <Card>
          <p className="text-sm font-medium">Lease</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {formatDate(currentLease.startDate)} – {formatDate(currentLease.endDate)}
          </p>
          <p className="text-sm text-foreground-muted">
            {formatNaira(currentLease.rentAmountMinor)} / {currentLease.paymentFrequency.toLowerCase()}
          </p>
          <Badge tone={currentLease.status === "ACTIVE" ? "success" : "warning"}>{currentLease.status.replaceAll("_", " ")}</Badge>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Maintenance</p>
          {openMaintenance.length > 0 && <Badge tone="warning">{openMaintenance.length} open</Badge>}
        </div>
        <Link href="/tenant/maintenance">
          <Button className="mt-3 w-full" variant="secondary">
            {openMaintenance.length > 0 ? "Track requests" : "Report an issue"}
          </Button>
        </Link>
      </Card>

      <Card>
        <p className="text-sm font-medium">Documents</p>
        {tenant.documents.length === 0 ? (
          <p className="mt-2 text-sm text-foreground-muted">No documents on file yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {tenant.documents.map((d) => (
              <li key={d.id}>
                <a href={d.fileUrl} className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
                  {d.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="text-sm font-medium">Messages &amp; Announcements</p>
        <p className="mt-2 text-sm text-foreground-muted">No messages yet.</p>
      </Card>
    </div>
  );
}

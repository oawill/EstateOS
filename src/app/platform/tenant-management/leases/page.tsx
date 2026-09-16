import Link from "next/link";
import { LeaseStatus } from "@prisma/client";
import { Badge, Button, Card, Input, Select } from "@/components/shared/ui";
import { formatNaira, formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { searchLeases } from "@/server/modules/tenantManagement/platformAdmin";

const STATUS_TONE = {
  DRAFT: "neutral",
  PENDING_SIGNATURE: "info",
  ACTIVE: "success",
  EXPIRING: "warning",
  RENEWAL_PENDING: "warning",
  EXPIRED: "neutral",
  TERMINATED: "neutral",
} as const;

export default async function PlatformLeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await guardPage(() => requirePlatformAdmin());
  const { q, status } = await searchParams;
  const parsedStatus = status && status in LeaseStatus ? (status as LeaseStatus) : undefined;
  const leases = await searchLeases(parsedStatus, q);

  return (
    <div className="space-y-4">
      <Card>
        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search tenant, lease code or property" className="sm:col-span-2" />
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {Object.values(LeaseStatus).map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {(q || status) && (
              <Link href="/platform/tenant-management/leases">
                <Button type="button" variant="secondary">
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {leases.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No leases match these filters.</p>
          </Card>
        )}
        {leases.map((lease) => (
          <Card key={lease.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {lease.tenant.fullName} · {lease.leaseCode}
              </p>
              <p className="text-sm text-foreground-muted">
                {lease.unit.property.name} · {lease.unit.label} · Owner: {lease.unit.property.owner.name}
              </p>
              <p className="text-sm text-foreground-muted">
                {formatDate(lease.startDate)} – {formatDate(lease.endDate)} · {formatNaira(lease.rentAmountMinor)} /{" "}
                {lease.paymentFrequency.toLowerCase()}
              </p>
            </div>
            <Badge tone={STATUS_TONE[lease.status]}>{lease.status.replaceAll("_", " ")}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { DemoRequestStatus, OrganizationType } from "@prisma/client";
import { Badge, Button, Card, Input, Select } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { DEMO_REQUEST_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { listAssignableStaff, listDemoRequests } from "@/server/modules/demoRequests/service";
import { UNIT_RANGE_OPTIONS } from "@/app/request-demo/labels";

function formatUnits(r: { unitRange: string | null; numberOfUnits: number | null }): string {
  if (r.unitRange) {
    const label = UNIT_RANGE_OPTIONS.find(([value]) => value === r.unitRange)?.[1] ?? r.unitRange;
    return `${label} units`;
  }
  return r.numberOfUnits ? `${r.numberOfUnits} units` : "Units not specified";
}

export default async function DemoRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; country?: string; organizationType?: string; assignedToUserId?: string; date?: string }>;
}) {
  await guardPage(() => requirePlatformAdmin());
  const params = await searchParams;

  const status = params.status && params.status in DemoRequestStatus ? (params.status as DemoRequestStatus) : undefined;
  const organizationType =
    params.organizationType && params.organizationType in OrganizationType
      ? (params.organizationType as OrganizationType)
      : undefined;
  const date = params.date ? new Date(params.date) : undefined;
  const from = date ? new Date(date.setUTCHours(0, 0, 0, 0)) : undefined;
  const to = date ? new Date(new Date(date).setUTCHours(23, 59, 59, 999)) : undefined;

  const [requests, staff] = await Promise.all([
    listDemoRequests({
      status,
      country: params.country || undefined,
      organizationType,
      assignedToUserId: params.assignedToUserId || undefined,
      from,
      to,
    }),
    listAssignableStaff(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Demo Requests</h1>

      <Card>
        <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Select name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            {Object.values(DemoRequestStatus).map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Select name="organizationType" defaultValue={params.organizationType ?? ""}>
            <option value="">All types</option>
            {Object.values(OrganizationType).map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Input name="country" defaultValue={params.country ?? ""} placeholder="Country" />
          <Select name="assignedToUserId" defaultValue={params.assignedToUserId ?? ""}>
            <option value="">Anyone assigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input name="date" type="date" defaultValue={params.date ?? ""} />
          <div className="col-span-2 flex gap-2 sm:col-span-5">
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            <Link href="/platform/demo-requests">
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {requests.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No demo requests match these filters.</p>
          </Card>
        )}
        {requests.map((r) => (
          <Link key={r.id} href={`/platform/demo-requests/${r.id}`}>
            <Card className="hover:border-primary/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {r.referenceNumber} · {r.fullName}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {r.organizationName} · {r.organizationType.replaceAll("_", " ")} · {r.city}, {r.country} ·{" "}
                    {formatUnits(r)}
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {formatDate(r.createdAt)}
                    {r.assignedTo ? ` · Assigned to ${r.assignedTo.name}` : ""}
                  </p>
                </div>
                <Badge tone={DEMO_REQUEST_STATUS_TONE[r.status]}>{r.status.replaceAll("_", " ")}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

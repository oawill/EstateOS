import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser, type CurrentUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { getPropertyDetail } from "@/server/modules/tenantManagement/property";
import { getPropertyFinancialSummary } from "@/server/modules/tenantManagement/dashboard";
import { listAccessibleMaintenanceRequests } from "@/server/modules/tenantManagement/maintenance";
import { formatDate, formatNaira } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "financials", label: "Financials" },
  { key: "maintenance", label: "Maintenance" },
  { key: "activity", label: "Activity" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function OwnerPropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "overview";

  const { user } = await guardPage(async () => requirePropertyOwner(await requireUser()));

  let property: Awaited<ReturnType<typeof getPropertyDetail>>;
  try {
    property = await getPropertyDetail(user, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/owner/portfolio" className="text-sm text-foreground-muted hover:underline">
          ← Portfolio
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{property.name}</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          {property.addressLine}, {property.city}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/owner/properties/${id}?tab=${t.key}`}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-surface shadow-sm" : "text-foreground-muted"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "overview" && <OverviewTab property={property} />}
      {tab === "financials" && <FinancialsTab user={user} propertyId={id} />}
      {tab === "maintenance" && <MaintenanceTab propertyId={id} />}
      {tab === "activity" && <ActivityTab propertyId={id} />}
    </div>
  );
}

function OverviewTab({ property }: { property: Awaited<ReturnType<typeof getPropertyDetail>> }) {
  return (
    <div className="space-y-3">
      {property.units.map((unit) => {
        const activeLease = unit.leases[0];
        const currentTenant = unit.tenants.find((t) => t.status === "ACTIVE");
        return (
          <Card key={unit.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{unit.label}</p>
                {currentTenant ? (
                  <p className="mt-0.5 text-sm text-foreground-muted">Tenant: {currentTenant.fullName}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-foreground-muted">No current tenant</p>
                )}
                {activeLease && (
                  <p className="mt-0.5 text-xs text-foreground-muted">Lease expires {formatDate(activeLease.endDate)}</p>
                )}
              </div>
              <Badge tone={unit.status === "OCCUPIED" ? "success" : "neutral"}>{unit.status}</Badge>
            </div>
          </Card>
        );
      })}
      {property.managers.length > 0 && (
        <Card>
          <p className="text-sm font-medium">Property manager</p>
          <p className="mt-1 text-sm text-foreground-muted">{property.managers.map((m) => m.user.name).join(", ")}</p>
        </Card>
      )}
    </div>
  );
}

async function FinancialsTab({ user, propertyId }: { user: CurrentUser; propertyId: string }) {
  const summary = await getPropertyFinancialSummary(user, propertyId);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <p className="text-xs text-foreground-muted">Rent expected (month)</p>
        <p className="mt-1 text-lg font-semibold">{formatNaira(summary.rentExpectedMinor)}</p>
      </Card>
      <Card>
        <p className="text-xs text-foreground-muted">Rent collected (month)</p>
        <p className="mt-1 text-lg font-semibold text-success">{formatNaira(summary.rentCollectedMinor)}</p>
      </Card>
      <Card>
        <p className="text-xs text-foreground-muted">Outstanding</p>
        <p className="mt-1 text-lg font-semibold text-warning">{formatNaira(summary.outstandingMinor)}</p>
      </Card>
      <Card>
        <p className="text-xs text-foreground-muted">Maintenance spend (paid)</p>
        <p className="mt-1 text-lg font-semibold">{formatNaira(summary.maintenanceExpensePaidMinor)}</p>
      </Card>
    </div>
  );
}

async function MaintenanceTab({ propertyId }: { propertyId: string }) {
  const requests = await listAccessibleMaintenanceRequests([propertyId]);

  if (requests.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground-muted">No maintenance requests for this property.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{request.category.replaceAll("_", " ")}</p>
              <p className="mt-0.5 text-sm text-foreground-muted">{request.description}</p>
              {request.vendorName && <p className="mt-1 text-xs text-foreground-muted">Vendor: {request.vendorName}</p>}
              {request.expenses.length > 0 && (
                <p className="mt-1 text-xs text-foreground-muted">
                  Cost: {formatNaira(request.expenses.reduce((sum, e) => sum + (e.finalAmountMinor ?? e.approvedAmountMinor ?? e.estimateMinor ?? 0), 0))}
                </p>
              )}
              <p className="mt-1 text-xs text-foreground-muted">
                {request.completedAt ? `Completed ${formatDate(request.completedAt)}` : `Reported ${formatDate(request.createdAt)}`}
              </p>
            </div>
            <Badge tone={request.status === "COMPLETED" || request.status === "CLOSED" ? "success" : "warning"}>
              {request.status.replaceAll("_", " ")}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

async function ActivityTab({ propertyId }: { propertyId: string }) {
  const requests = await listAccessibleMaintenanceRequests([propertyId]);

  type Entry = { date: Date; label: string };
  const entries: Entry[] = [];
  for (const r of requests) {
    entries.push({ date: r.createdAt, label: `Maintenance reported: ${r.category.replaceAll("_", " ")}` });
    if (r.completedAt) entries.push({ date: r.completedAt, label: `Maintenance completed: ${r.category.replaceAll("_", " ")}` });
  }
  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground-muted">No activity recorded yet for this property.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 20).map((entry, i) => (
        <div key={i} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
          <span>{entry.label}</span>
          <span className="text-xs text-foreground-muted">{formatDate(entry.date)}</span>
        </div>
      ))}
    </div>
  );
}

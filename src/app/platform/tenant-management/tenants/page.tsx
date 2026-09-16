import Link from "next/link";
import { Badge, Button, Card, Input } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { searchTenants } from "@/server/modules/tenantManagement/platformAdmin";

const STATUS_TONE = { APPLICANT: "info", APPROVED: "info", ACTIVE: "success", NOTICE_GIVEN: "warning", FORMER: "neutral" } as const;

export default async function PlatformTenantsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await guardPage(() => requirePlatformAdmin());
  const { q } = await searchParams;
  const tenants = await searchTenants(q);

  return (
    <div className="space-y-4">
      <Card>
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by name, email or phone" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q && (
            <Link href="/platform/tenant-management/tenants">
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          )}
        </form>
      </Card>

      <div className="space-y-3">
        {tenants.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No tenants match this search.</p>
          </Card>
        )}
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{tenant.fullName}</p>
              <p className="text-sm text-foreground-muted">
                {tenant.unit
                  ? `${tenant.unit.property.name} · ${tenant.unit.label} · Owner: ${tenant.unit.property.owner.name}`
                  : "No unit assigned"}
              </p>
            </div>
            <Badge tone={STATUS_TONE[tenant.status]}>{tenant.status.replaceAll("_", " ")}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

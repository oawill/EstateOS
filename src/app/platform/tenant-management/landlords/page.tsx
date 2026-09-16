import Link from "next/link";
import { Badge, Button, Card, Input } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { searchLandlords } from "@/server/modules/tenantManagement/platformAdmin";

export default async function PlatformLandlordsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await guardPage(() => requirePlatformAdmin());
  const { q } = await searchParams;
  const landlords = await searchLandlords(q);

  return (
    <div className="space-y-4">
      <Card>
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by name or email" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q && (
            <Link href="/platform/tenant-management/landlords">
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          )}
        </form>
      </Card>

      <div className="space-y-3">
        {landlords.length === 0 && (
          <Card>
            <p className="text-sm text-foreground-muted">No landlords match this search.</p>
          </Card>
        )}
        {landlords.map((owner) => (
          <Card key={owner.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{owner.name}</p>
              <p className="text-sm text-foreground-muted">
                {owner.email ?? "No email"} {owner.countryOfResidence ? `· ${owner.countryOfResidence}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge>{owner._count.properties} propert{owner._count.properties === 1 ? "y" : "ies"}</Badge>
              <Badge tone="neutral">{owner._count.createdTenants} tenant{owner._count.createdTenants === 1 ? "" : "s"}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

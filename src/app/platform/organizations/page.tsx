import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { ORGANIZATION_STATUS_TONE } from "@/lib/statusTones";
import { listOrganizations } from "@/server/modules/organizations/service";

export default async function OrganizationsPage() {
  await guardPage(() => requirePlatformAdmin());
  const organizations = await listOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Organizations</h1>
        <Link href="/platform/organizations/new">
          <Button>New organization</Button>
        </Link>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No organizations yet. Create one directly, or activate one from a demo request.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/platform/organizations/${org.id}`} className="block">
              <Card className="hover:border-slate-300">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {org.organizationType.replaceAll("_", " ")} · {org._count.estates} estate(s) ·{" "}
                      {org.subscriptions.length} subscription(s)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {org.subscriptions.map((s) => (
                        <Badge key={s.id} tone="info">
                          {s.module.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge tone={ORGANIZATION_STATUS_TONE[org.status]}>{org.status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

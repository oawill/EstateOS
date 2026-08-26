import { Badge, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { listAllUsers } from "@/server/modules/platform/service";

export default async function PlatformUsersPage() {
  await guardPage(() => requirePlatformAdmin());
  const users = await listAllUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">{u.email ?? u.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.isPlatformAdmin && <Badge tone="success">Platform admin</Badge>}
                <Badge tone="neutral">
                  {u._count.memberships} {u._count.memberships === 1 ? "membership" : "memberships"}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { listRecentAuditLogs } from "@/server/modules/platform/service";

export default async function PlatformAuditPage() {
  await guardPage(() => requirePlatformAdmin());
  const entries = await listRecentAuditLogs();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <div className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
        {entries.map((entry) => (
          <Card key={entry.id} className="py-3">
            <p className="text-sm">
              {entry.action}
              {entry.estate ? ` · ${entry.estate.name}` : " · Platform"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {entry.actor?.name ?? "System"} · {formatDate(entry.createdAt)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { countCurrentlyCheckedIn, listExpectedToday, listRecentActivity, countAwaitingApproval } from "@/server/modules/visitors/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { formatDateTime } from "@/lib/utils";
import { GateModeClient } from "./GateModeClient";

export default async function GatePage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstatePermission(estateSlug, "visitors:verify"));
  const estateLocale = await getEstateLocale(membership.estateId);

  const [checkedInCount, expectedToday, recentActivity, awaitingApprovalCount] = await Promise.all([
    countCurrentlyCheckedIn(membership.estateId),
    listExpectedToday(membership.estateId, estateLocale.timezone),
    listRecentActivity(membership.estateId, 8),
    countAwaitingApproval(membership.estateId),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Gate Operations</p>
        <h1 className="text-xl font-semibold">{membership.estateName}</h1>
        <p className="text-sm text-foreground-muted">
          Officer: {user.name} <Badge tone="success">● On Duty</Badge>
        </p>
      </div>

      <GateModeClient estateSlug={estateSlug} initialCheckedIn={checkedInCount} />

      <div className="grid grid-cols-3 gap-2">
        <Link href={`/${estateSlug}/gate`}>
          <Card className="text-center">
            <p className="text-2xl font-semibold">{expectedToday.length}</p>
            <p className="text-xs text-foreground-muted">Expected Today</p>
          </Card>
        </Link>
        <Link href={`/${estateSlug}/gate/inside`}>
          <Card className="text-center">
            <p className="text-2xl font-semibold">{checkedInCount}</p>
            <p className="text-xs text-foreground-muted">Currently Inside</p>
          </Card>
        </Link>
        <Card className="text-center">
          <p className="text-2xl font-semibold">{awaitingApprovalCount}</p>
          <p className="text-xs text-foreground-muted">Awaiting Approval</p>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Recent Activity</p>
        <div className="space-y-2">
          {recentActivity.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No gate activity yet today.</p>
            </Card>
          )}
          {recentActivity.map((entry) => {
            const occupancy = entry.pass.resident.occupancies[0];
            const unit = occupancy ? `${occupancy.unit.property.addressLabel}${occupancy.unit.label ? ` · ${occupancy.unit.label}` : ""}` : entry.pass.resident.firstName;
            return (
              <Card key={entry.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{entry.pass.visitorName}</p>
                  <p className="text-xs text-foreground-muted">
                    {entry.checkOutAt ? "Exited" : "Entered"} · {unit} · {entry.gate}
                  </p>
                </div>
                <p className="text-xs text-foreground-muted">
                  {formatDateTime(entry.checkOutAt ?? entry.checkInAt, estateLocale.timezone, estateLocale.locale)}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

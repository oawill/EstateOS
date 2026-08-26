import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { getEstateDetail } from "@/server/modules/platform/service";
import { listPlans } from "@/server/modules/platform/plans";
import { toggleEstateStatusAction } from "../../actions";
import { AssignPlanForm } from "./AssignPlanForm";

const STATUS_TONE = {
  TRIAL: "neutral",
  ACTIVE: "success",
  PAST_DUE: "warning",
  SUSPENDED: "danger",
  CANCELLED: "danger",
} as const;

export default async function PlatformEstateDetailPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const { estate, recentAudit } = await guardPage(async () => {
    await requirePlatformAdmin();
    return getEstateDetail(estateId);
  });
  const plans = await listPlans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{estate.name}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {estate._count.members} members · {estate._count.residents} residents · {estate._count.properties}{" "}
          properties
        </p>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Subscription status</p>
            <div className="mt-1.5">
              <Badge tone={STATUS_TONE[estate.subscriptionStatus]}>{estate.subscriptionStatus}</Badge>
            </div>
            {estate.trialEndsAt && (
              <p className="mt-2 text-sm text-slate-500">Trial ends {formatDate(estate.trialEndsAt)}</p>
            )}
          </div>
          {estate.subscriptionStatus === "SUSPENDED" ? (
            <form
              action={async () => {
                "use server";
                await toggleEstateStatusAction(estate.id, "ACTIVE");
              }}
            >
              <Button type="submit" variant="secondary">
                Reactivate
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await toggleEstateStatusAction(estate.id, "SUSPENDED");
              }}
            >
              <Button type="submit" variant="danger">
                Suspend
              </Button>
            </form>
          )}
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-slate-700">Plan</p>
        <AssignPlanForm
          estateId={estate.id}
          currentPlanId={estate.planId}
          currentTrialEndsAt={estate.trialEndsAt}
          plans={plans}
        />
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-700">Recent activity</h2>
        <div className="space-y-2">
          {recentAudit.length === 0 && <p className="text-sm text-slate-500">No recent activity.</p>}
          {recentAudit.map((entry) => (
            <Card key={entry.id} className="py-3">
              <p className="text-sm">{entry.action}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

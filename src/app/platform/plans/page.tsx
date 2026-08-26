import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatNaira } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { listPlans } from "@/server/modules/platform/plans";
import { setPlanActiveAction } from "./actions";

export default async function PlatformPlansPage() {
  await guardPage(() => requirePlatformAdmin());
  const plans = await listPlans();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Plans</h1>
        <Link href="/platform/plans/new">
          <Button type="button">New plan</Button>
        </Link>
      </div>
      <div className="space-y-3">
        {plans.length === 0 && <p className="text-sm text-slate-500">No plans yet.</p>}
        {plans.map((plan) => (
          <Card key={plan.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{plan.name}</p>
                  <Badge tone={plan.isActive ? "success" : "neutral"}>{plan.isActive ? "Active" : "Retired"}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {formatNaira(plan.monthlyPriceKobo)}/mo
                  {plan.annualPriceKobo ? ` · ${formatNaira(plan.annualPriceKobo)}/yr` : ""} ·{" "}
                  {plan.unitLimit ? `${plan.unitLimit} unit limit` : "Unlimited units"}
                </p>
                {plan.featureSummary && <p className="mt-1 text-sm text-slate-600">{plan.featureSummary}</p>}
              </div>
              <form
                action={async () => {
                  "use server";
                  await setPlanActiveAction(plan.id, !plan.isActive);
                }}
              >
                <Button type="submit" variant="secondary">
                  {plan.isActive ? "Retire" : "Reactivate"}
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

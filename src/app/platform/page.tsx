import { Badge, Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { listAllEstates } from "@/server/modules/platform/service";
import { toggleEstateStatusAction } from "./actions";

const STATUS_TONE = {
  TRIAL: "neutral",
  ACTIVE: "success",
  PAST_DUE: "warning",
  SUSPENDED: "danger",
  CANCELLED: "danger",
} as const;

export default async function PlatformEstatesPage() {
  await guardPage(() => requirePlatformAdmin());
  const estates = await listAllEstates();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Estates</h1>
      <div className="space-y-3">
        {estates.map((estate) => (
          <Card key={estate.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{estate.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {estate._count.members} members · {estate._count.residents} residents ·{" "}
                  {estate._count.properties} properties
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={STATUS_TONE[estate.subscriptionStatus]}>{estate.subscriptionStatus}</Badge>
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
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

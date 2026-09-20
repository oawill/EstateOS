import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { ORGANIZATION_STATUS_TONE, SUBSCRIPTION_STATUS_TONE } from "@/lib/statusTones";
import { getOrganizationDetail } from "@/server/modules/organizations/service";
import { listPlans } from "@/server/modules/platform/plans";
import { OrganizationStatusForm } from "./OrganizationStatusForm";
import { AddSubscriptionForm } from "./AddSubscriptionForm";
import { SubscriptionStatusForm } from "./SubscriptionStatusForm";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { organization, recentAudit } = await guardPage(async () => {
    await requirePlatformAdmin();
    return getOrganizationDetail(id);
  });
  const plans = await listPlans();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{organization.name}</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">{organization.organizationType.replaceAll("_", " ")}</p>
        </div>
        <Badge tone={ORGANIZATION_STATUS_TONE[organization.status]}>{organization.status}</Badge>
      </div>

      <Card>
        <h2 className="mb-3 font-medium">Contact &amp; status</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Primary contact</p>
            <p className="mt-0.5 text-sm">{organization.primaryContactName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Email</p>
            <p className="mt-0.5 text-sm">{organization.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Phone</p>
            <p className="mt-0.5 text-sm">{organization.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Country</p>
            <p className="mt-0.5 text-sm">{organization.country}</p>
          </div>
          {organization.sourceDemoRequest && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Converted from</p>
              <Link
                href={`/platform/demo-requests/${organization.sourceDemoRequest.id}`}
                className="mt-0.5 block text-sm text-primary hover:underline"
              >
                {organization.sourceDemoRequest.referenceNumber}
              </Link>
            </div>
          )}
        </div>
        {organization.billingNotes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Billing notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{organization.billingNotes}</p>
          </div>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <OrganizationStatusForm organizationId={organization.id} currentStatus={organization.status} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Subscriptions</h2>
        <div className="space-y-3">
          {organization.subscriptions.length === 0 && <p className="text-sm text-slate-500">No subscriptions yet.</p>}
          {organization.subscriptions.map((sub) => (
            <div key={sub.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{sub.module.replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {sub.plan?.name ?? "No plan"}
                    {sub.monthlyPriceKobo != null
                      ? ` · ${formatNaira(sub.monthlyPriceKobo)}/mo`
                      : sub.plan
                        ? ` · ${formatNaira(sub.plan.monthlyPriceKobo)}/mo`
                        : ""}
                    {sub.quantity ? ` · qty ${sub.quantity}` : ""}
                  </p>
                  {sub.trialEndsAt && <p className="mt-0.5 text-xs text-foreground-muted">Trial ends {formatDate(sub.trialEndsAt)}</p>}
                </div>
                <Badge tone={SUBSCRIPTION_STATUS_TONE[sub.status]}>{sub.status}</Badge>
              </div>
              <div className="mt-2">
                <SubscriptionStatusForm organizationId={organization.id} subscriptionId={sub.id} currentStatus={sub.status} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <AddSubscriptionForm organizationId={organization.id} plans={plans} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Linked estates</h2>
        {organization.estates.length === 0 ? (
          <p className="text-sm text-slate-500">No estates linked to this organization yet.</p>
        ) : (
          <div className="space-y-2">
            {organization.estates.map((estate) => (
              <Link
                key={estate.id}
                href={`/platform/estates/${estate.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm hover:border-slate-300"
              >
                <span>{estate.name}</span>
                <Badge tone="neutral">{estate.subscriptionStatus}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Recent activity</h2>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {recentAudit.map((log) => (
              <div key={log.id} className="text-sm">
                <span className="text-foreground-muted">{formatDate(log.createdAt)}</span> — {log.action.replaceAll("_", " ")}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

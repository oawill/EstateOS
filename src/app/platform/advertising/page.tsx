import { Badge, Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { ADVERTISER_STATUS_TONE, CAMPAIGN_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { getAdvertisingOverview, listAdvertisers, listCampaigns } from "@/server/modules/advertising/service";
import {
  approveAdvertiserAction,
  approveCampaignAction,
  rejectAdvertiserAction,
  rejectCampaignAction,
  suspendAdvertiserAction,
} from "./actions";

export default async function PlatformAdvertisingPage() {
  await guardPage(() => requirePlatformAdmin());

  const [overview, advertisers, pendingCampaigns, activeCampaigns] = await Promise.all([
    getAdvertisingOverview(),
    listAdvertisers(),
    listCampaigns({ status: "PENDING_REVIEW" }),
    listCampaigns({ status: "ACTIVE" }),
  ]);

  const pendingAdvertisers = advertisers.filter((a) => a.status === "PENDING_REVIEW");
  const otherAdvertisers = advertisers.filter((a) => a.status !== "PENDING_REVIEW");

  const tiles: [string, string | number][] = [
    ["Active advertisers", overview.activeAdvertisers],
    ["Pending advertisers", overview.pendingAdvertisers],
    ["Active campaigns", overview.activeCampaigns],
    ["Pending campaigns", overview.pendingCampaigns],
    ["Reported campaigns", overview.reportedCampaigns],
    ["Total impressions", overview.totalImpressions],
    ["Total clicks", overview.totalClicks],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Advertising</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Advertiser applications</h2>
        {pendingAdvertisers.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No pending advertiser applications.</p>
          </Card>
        ) : (
          pendingAdvertisers.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{a.businessName}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {a.contactName} · {a.email} · {a.phone}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">{a.category.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-foreground-muted">{a.description}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <form action={async () => { "use server"; await approveAdvertiserAction(a.id); }}>
                    <button type="submit" className="rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-white">
                      Approve
                    </button>
                  </form>
                  <form action={async (formData: FormData) => { "use server"; await rejectAdvertiserAction(a.id, formData); }}>
                    <button type="submit" className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Campaign review</h2>
        {pendingCampaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No campaigns awaiting review.</p>
          </Card>
        ) : (
          pendingCampaigns.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{c.headline}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{c.body}</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {c.advertiser.businessName} · Targeting: {c.targetEstateIds.length === 0 ? "All enabled estates" : `${c.targetEstateIds.length} estate(s)`}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                    {c.fixedPriceKobo != null ? ` · ${formatNaira(c.fixedPriceKobo)}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <form action={async () => { "use server"; await approveCampaignAction(c.id); }}>
                    <button type="submit" className="rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-white">
                      Approve
                    </button>
                  </form>
                  <form action={async (formData: FormData) => { "use server"; await rejectCampaignAction(c.id, formData); }}>
                    <button type="submit" className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Active campaigns</h2>
        {activeCampaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No active campaigns.</p>
          </Card>
        ) : (
          activeCampaigns.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{c.headline}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{c.advertiser.businessName}</p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {c._count.impressions} impressions · {c._count.clicks} clicks
                    {c._count.reports > 0 ? ` · ${c._count.reports} report(s)` : ""}
                  </p>
                </div>
                <Badge tone={CAMPAIGN_STATUS_TONE[c.status]}>{c.status}</Badge>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Advertisers</h2>
        {otherAdvertisers.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{a.businessName}</p>
                <p className="mt-0.5 text-sm text-slate-500">{a.category.replaceAll("_", " ")} · {a._count.campaigns} campaign(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={ADVERTISER_STATUS_TONE[a.status]}>{a.status.replaceAll("_", " ")}</Badge>
                {a.status !== "SUSPENDED" && (
                  <form action={async () => { "use server"; await suspendAdvertiserAction(a.id); }}>
                    <button type="submit" className="text-xs font-medium text-danger hover:underline">
                      Suspend
                    </button>
                  </form>
                )}
              </div>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

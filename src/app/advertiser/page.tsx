import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { ADVERTISER_STATUS_TONE, CAMPAIGN_STATUS_TONE } from "@/lib/statusTones";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAdvertiserByUserId, listCampaignsForOwnAdvertiser } from "@/server/modules/advertising/service";
import { ApplyForm } from "./ApplyForm";
import { PauseCampaignButton } from "./PauseCampaignButton";

export default async function AdvertiserPortalPage() {
  const user = await guardPage(() => requireUser());
  const advertiser = await getAdvertiserByUserId(user.id);

  if (!advertiser) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-12">
        <h1 className="text-xl font-semibold">Become a NidraQ advertiser</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Tell us about your business. NidraQ reviews every application before advertising is enabled.
        </p>
        <Card className="mt-6">
          <ApplyForm />
        </Card>
      </main>
    );
  }

  if (advertiser.status === "PENDING_REVIEW") {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-12">
        <Card>
          <h1 className="text-lg font-semibold">{advertiser.businessName}</h1>
          <div className="mt-2">
            <Badge tone={ADVERTISER_STATUS_TONE[advertiser.status]}>Pending review</Badge>
          </div>
          <p className="mt-3 text-sm text-foreground-muted">
            Thanks for applying. NidraQ is reviewing your business — we&apos;ll let you know once you&apos;re approved
            to create campaigns.
          </p>
        </Card>
      </main>
    );
  }

  if (advertiser.status === "REJECTED" || advertiser.status === "SUSPENDED" || advertiser.status === "INACTIVE") {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-12">
        <Card>
          <h1 className="text-lg font-semibold">{advertiser.businessName}</h1>
          <div className="mt-2">
            <Badge tone={ADVERTISER_STATUS_TONE[advertiser.status]}>{advertiser.status.replaceAll("_", " ")}</Badge>
          </div>
          {advertiser.rejectionReason && <p className="mt-3 text-sm text-foreground-muted">{advertiser.rejectionReason}</p>}
        </Card>
      </main>
    );
  }

  const campaigns = await listCampaignsForOwnAdvertiser(user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{advertiser.businessName}</h1>
          <Badge tone={ADVERTISER_STATUS_TONE[advertiser.status]}>{advertiser.status}</Badge>
        </div>
        <Link href="/advertiser/campaigns/new">
          <Button>Create Campaign</Button>
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {campaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No campaigns yet.</p>
          </Card>
        ) : (
          campaigns.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{c.headline}</p>
                  <p className="mt-0.5 text-sm text-foreground-muted">{c.body}</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                    {c.fixedPriceKobo != null ? ` · ${formatNaira(c.fixedPriceKobo)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {c._count.impressions} impressions · {c._count.clicks} clicks
                  </p>
                  {c.rejectionReason && <p className="mt-1 text-xs text-danger">Rejected: {c.rejectionReason}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={CAMPAIGN_STATUS_TONE[c.status]}>{c.status.replaceAll("_", " ")}</Badge>
                  {(c.status === "ACTIVE" || c.status === "PAUSED") && (
                    <PauseCampaignButton campaignId={c.id} isPaused={c.status === "PAUSED"} />
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}

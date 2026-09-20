import { Badge, Button } from "@/components/shared/ui";
import { hideAdAction, trackAdClickAction } from "./adActions";

export interface SponsoredCampaign {
  id: string;
  headline: string;
  body: string;
  ctaLabel: string;
  destinationUrl: string | null;
  offerTerms: string | null;
  advertiser: { businessName: string; advertiserType: string };
}

/**
 * Always clearly labeled "Sponsored" — never disguised as an estate
 * announcement (spec section 3). Renders nothing if there's no eligible
 * campaign rather than showing a broken/empty ad container (spec 56).
 */
export function SponsoredCard({ estateSlug, campaign }: { estateSlug: string; campaign: SponsoredCampaign }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Badge tone="neutral">Sponsored</Badge>
        {campaign.advertiser.advertiserType === "VERIFIED_VENDOR" && <Badge tone="info">⭐ Verified NidraQ Vendor</Badge>}
      </div>
      <p className="mt-2 font-medium">{campaign.headline}</p>
      <p className="mt-1 text-sm text-foreground-muted">{campaign.body}</p>
      <p className="mt-1 text-xs text-foreground-muted">{campaign.advertiser.businessName}</p>
      {campaign.offerTerms && <p className="mt-1 text-xs text-foreground-muted">{campaign.offerTerms}</p>}

      <div className="mt-3 flex items-center gap-3">
        {campaign.destinationUrl ? (
          <form
            action={async (formData) => {
              "use server";
              await trackAdClickAction(estateSlug, campaign.id, campaign.destinationUrl!, formData);
            }}
          >
            <Button type="submit">{campaign.ctaLabel}</Button>
          </form>
        ) : (
          <Button type="button" disabled>
            {campaign.ctaLabel}
          </Button>
        )}

        <form
          action={async (formData) => {
            "use server";
            await hideAdAction(estateSlug, campaign.id, formData);
          }}
        >
          <button type="submit" className="text-xs font-medium text-foreground-muted hover:underline">
            Hide
          </button>
        </form>
      </div>
    </div>
  );
}

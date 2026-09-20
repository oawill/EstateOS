import { Badge, Card, Input } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { listEligibleCampaigns, recordImpression } from "@/server/modules/advertising/service";

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ estateSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { estateSlug } = await params;
  const { q } = await searchParams;
  const { user, membership } = await guardPage(() => requireEstateMember(estateSlug));

  const campaigns = await listEligibleCampaigns(membership.estateId, user.id, "RESIDENT_MARKETPLACE");
  await Promise.all(campaigns.map((c) => recordImpression(c.id, user.id, membership.estateId, "RESIDENT_MARKETPLACE")));
  const query = (q ?? "").trim().toLowerCase();
  const filtered = query
    ? campaigns.filter(
        (c) =>
          c.headline.toLowerCase().includes(query) ||
          c.body.toLowerCase().includes(query) ||
          c.advertiser.businessName.toLowerCase().includes(query) ||
          c.advertiser.category.toLowerCase().includes(query),
      )
    : campaigns;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Marketplace</h1>
        <p className="mt-1 text-sm text-foreground-muted">Useful, verified services and offers near {membership.estateName}.</p>
      </div>

      <form method="get" className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="What do you need? e.g. Plumber, Cleaner, Internet" className="flex-1" />
      </form>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">
            {campaigns.length === 0
              ? "Nothing available here right now — check back soon."
              : "No results for that search."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((campaign) => (
            <Card key={campaign.id}>
              <div className="flex items-center justify-between">
                <Badge tone="neutral">Sponsored</Badge>
                {campaign.advertiser.advertiserType === "VERIFIED_VENDOR" && <Badge tone="info">⭐ Verified</Badge>}
              </div>
              <p className="mt-2 font-medium">{campaign.headline}</p>
              <p className="mt-1 text-sm text-foreground-muted">{campaign.body}</p>
              <p className="mt-2 text-xs text-foreground-muted">
                {campaign.advertiser.businessName} · {campaign.advertiser.category.replaceAll("_", " ")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

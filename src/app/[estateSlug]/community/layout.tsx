import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { hasPermission } from "@/server/auth/permissions";
import { getOrCreateCommunitySettings } from "@/server/modules/community/settings";
import { CommunityTabs } from "./CommunityTabs";

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ estateSlug: string }>;
}) {
  const { estateSlug } = await params;

  const { settings, showModeration } = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "community-posts:*");
    const settings = await getOrCreateCommunitySettings(membership.estateId);
    return { settings, showModeration: hasPermission(membership.role, "community-moderation:*") };
  });

  if (!settings.communityEnabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Community</h1>
        <Card>
          <p className="text-sm text-foreground-muted">
            Community isn&apos;t enabled for this estate yet. Contact your estate administrator.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Community</h1>
      <CommunityTabs estateSlug={estateSlug} showModeration={showModeration} />
      {children}
    </div>
  );
}

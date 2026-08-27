import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listFeed } from "@/server/modules/community/posts";
import { getOrCreateCommunitySettings } from "@/server/modules/community/settings";
import { PostComposer } from "./PostComposer";
import { FeedList } from "./FeedList";

export default async function CommunityFeedPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const { residentId, items, defaultDisplayNamePreference } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "community-posts:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const [items, settings] = await Promise.all([
      listFeed(membership.estateId),
      getOrCreateCommunitySettings(membership.estateId),
    ]);
    return {
      residentId: resident.id,
      items,
      defaultDisplayNamePreference: settings.defaultDisplayNamePreference,
    };
  });

  return (
    <div className="space-y-4">
      <PostComposer estateSlug={estateSlug} />
      <FeedList
        estateSlug={estateSlug}
        items={items}
        currentResidentId={residentId}
        defaultDisplayNamePreference={defaultDisplayNamePreference}
      />
    </div>
  );
}

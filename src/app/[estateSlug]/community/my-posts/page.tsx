import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listMyPosts } from "@/server/modules/community/posts";
import { listMyListings } from "@/server/modules/community/classifieds";
import { getOrCreateCommunitySettings } from "@/server/modules/community/settings";
import { FeedList } from "../FeedList";

export default async function MyPostsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const { residentId, posts, listings, defaultDisplayNamePreference } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "community-posts:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const [posts, listings, settings] = await Promise.all([
      listMyPosts(membership.estateId, resident.id),
      listMyListings(membership.estateId, resident.id),
      getOrCreateCommunitySettings(membership.estateId),
    ]);
    return { residentId: resident.id, posts, listings, defaultDisplayNamePreference: settings.defaultDisplayNamePreference };
  });

  const postItems = posts.map((post) => ({ kind: "post" as const, createdAt: post.createdAt, post }));

  return (
    <div className="space-y-6">
      {listings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground-muted">My listings</h2>
          {listings.map((listing) => (
            <Link key={listing.id} href={`/${estateSlug}/community/classifieds/${listing.id}`}>
              <Card className="hover:border-primary/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{listing.title}</p>
                    <p className="text-sm text-foreground-muted">
                      {listing.priceKobo ? formatNaira(listing.priceKobo) : "Free"} · {formatDate(listing.createdAt)}
                    </p>
                  </div>
                  <Badge tone={listing.status === "SOLD" ? "success" : listing.status === "ACTIVE" ? "info" : "neutral"}>
                    {listing.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground-muted">My posts</h2>
        <FeedList
          estateSlug={estateSlug}
          items={postItems}
          currentResidentId={residentId}
          defaultDisplayNamePreference={defaultDisplayNamePreference}
        />
      </section>
    </div>
  );
}

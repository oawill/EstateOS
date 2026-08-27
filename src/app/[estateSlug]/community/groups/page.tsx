import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";

export default async function GroupsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "community-posts:*"));

  return (
    <Card>
      <p className="font-medium">Groups</p>
      <p className="mt-1 text-sm text-foreground-muted">
        Coming soon — interest-based groups (e.g. a book club, a fitness group) within your community.
      </p>
    </Card>
  );
}

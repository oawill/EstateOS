import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listAnnouncements } from "@/server/modules/announcements/service";

export default async function AnnouncementsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "announcements:*"));

  const announcements = await listAnnouncements(membership.estateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <Link href={`/${estateSlug}/announcements/new`}>
          <Button>New announcement</Button>
        </Link>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No announcements yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{announcement.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{announcement.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(announcement.createdAt)}</p>
                </div>
                <Badge>{announcement.category.replaceAll("_", " ")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

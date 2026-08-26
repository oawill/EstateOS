import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listNotificationsForResident } from "@/server/modules/announcements/service";
import { markNotificationReadAction } from "./actions";

export default async function NotificationsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const { notifications } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "announcements:read");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const notifications = await listNotificationsForResident(membership.estateId, resident.id);
    return { notifications };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Notifications</h1>

      {notifications.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.readAt;
            return (
              <Card key={notification.id} className={isUnread ? "border-slate-900" : undefined}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{notification.title}</p>
                      {isUnread && <Badge tone="warning">New</Badge>}
                      {notification.announcement && (
                        <Badge>{notification.announcement.category.replaceAll("_", " ")}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(notification.createdAt)}</p>
                  </div>
                  {isUnread && (
                    <form
                      action={async () => {
                        "use server";
                        await markNotificationReadAction(estateSlug, notification.id);
                      }}
                    >
                      <Button type="submit" variant="secondary">
                        Mark read
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

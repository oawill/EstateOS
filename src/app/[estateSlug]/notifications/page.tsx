import { Badge, Button, Card, Checkbox, Input, Label } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listNotificationsForResident } from "@/server/modules/announcements/service";
import { getOrCreateNotificationPreference } from "@/server/modules/notifications/preferences";
import { markNotificationReadAction, updateNotificationPreferencesAction } from "./actions";

export default async function NotificationsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const { notifications, preference } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "announcements:read");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const notifications = await listNotificationsForResident(membership.estateId, resident.id);
    const preference = await getOrCreateNotificationPreference(membership.estateId, resident.id);
    return { notifications, preference };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Notifications</h1>

      {notifications.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">No notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.readAt;
            return (
              <Card key={notification.id} className={isUnread ? "border-primary" : undefined}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{notification.title}</p>
                      {isUnread && <Badge tone="info">New</Badge>}
                      {notification.announcement && (
                        <Badge>{notification.announcement.category.replaceAll("_", " ")}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">{notification.body}</p>
                    <p className="mt-1 text-xs text-foreground-muted">{formatDate(notification.createdAt)}</p>
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

      <Card>
        <p className="font-medium">Notification preferences</p>
        <p className="mt-1 text-sm text-foreground-muted">
          Bills, payment confirmations and maintenance updates are always sent in-app. WhatsApp delivery for these is
          coming soon — opting in now means you&apos;ll be reached there as soon as it&apos;s available.
        </p>
        <form
          action={async (formData) => {
            "use server";
            await updateNotificationPreferencesAction(estateSlug, formData);
          }}
          className="mt-4 space-y-4"
        >
          <Checkbox name="whatsappOptIn" defaultChecked={preference.whatsappOptIn} label="Send me updates on WhatsApp" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="whatsappCountryCode">Country code</Label>
              <Input
                id="whatsappCountryCode"
                name="whatsappCountryCode"
                placeholder="+234"
                defaultValue={preference.whatsappCountryCode ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp number</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                placeholder="8012345678"
                defaultValue={preference.whatsappNumber ?? ""}
              />
            </div>
          </div>
          <Checkbox
            name="marketingOptIn"
            defaultChecked={preference.marketingOptIn}
            label="Also send me occasional product news and tips (optional — you can opt out anytime)"
          />
          <Button type="submit">Save preferences</Button>
        </form>
      </Card>
    </div>
  );
}

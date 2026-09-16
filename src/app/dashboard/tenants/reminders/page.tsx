import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getReminderSetting } from "@/server/modules/tenantManagement/reminders";
import { ReminderSettingForm, RunReminderSweepButton } from "./ReminderForms";

export default async function RemindersPage() {
  const user = await guardPage(() => requireUser());
  const setting = await getReminderSetting(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Rent Reminders</h1>
        <p className="text-sm text-foreground-muted">
          Professional, non-threatening reminders sent in-app before and after rent is due. Running the sweep more than once never sends a duplicate — each threshold is only ever sent once per rent period.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Reminder schedule</h2>
        <div className="mt-3">
          <ReminderSettingForm beforeDueDays={setting.beforeDueDays} afterDueDays={setting.afterDueDays} />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium">Send reminders</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          In production this would run automatically on a schedule; use this button to run it manually for now.
        </p>
        <div className="mt-3">
          <RunReminderSweepButton />
        </div>
      </Card>
    </div>
  );
}

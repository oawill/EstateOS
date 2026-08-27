import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function AccountSecurityPage() {
  await guardPage(() => requireUser());

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-12">
      <div>
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="mt-1 text-sm text-foreground-muted">Manage your EstateOS account password.</p>
      </div>
      <Card>
        <h2 className="mb-3 font-medium">Change Password</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}

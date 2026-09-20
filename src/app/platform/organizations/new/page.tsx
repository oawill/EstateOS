import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { NewOrganizationForm } from "./NewOrganizationForm";

export default async function NewOrganizationPage() {
  await guardPage(() => requirePlatformAdmin());

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">New organization</h1>
      <Card>
        <NewOrganizationForm />
      </Card>
    </div>
  );
}

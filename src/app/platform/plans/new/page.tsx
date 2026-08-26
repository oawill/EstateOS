import { guardPage } from "@/server/auth/pageGuard";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { NewPlanForm } from "./NewPlanForm";

export default async function NewPlanPage() {
  await guardPage(() => requirePlatformAdmin());

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">New plan</h1>
      <NewPlanForm />
    </div>
  );
}

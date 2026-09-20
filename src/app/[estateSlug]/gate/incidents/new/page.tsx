import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NewIncidentForm } from "./NewIncidentForm";

export default async function NewIncidentPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "incidents:*"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Report Incident</h1>
      <Card>
        <NewIncidentForm estateSlug={estateSlug} />
      </Card>
    </div>
  );
}

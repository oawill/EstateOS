import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NewTicketForm } from "../NewTicketForm";

export default async function NewTicketPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "own-maintenance:*"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Report a problem</h1>
      <Card>
        <NewTicketForm estateSlug={estateSlug} />
      </Card>
    </div>
  );
}

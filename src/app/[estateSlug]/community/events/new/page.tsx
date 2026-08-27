import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "community-events:*"));

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-medium">New event</h2>
      <NewEventForm estateSlug={estateSlug} />
    </div>
  );
}

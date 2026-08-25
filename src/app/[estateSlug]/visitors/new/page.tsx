import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NewVisitorForm } from "../NewVisitorForm";

export default async function NewVisitorPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "own-visitors:*"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Invite visitor</h1>
      <Card>
        <NewVisitorForm estateSlug={estateSlug} />
      </Card>
    </div>
  );
}

import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NewPropertyForm } from "../NewPropertyForm";

export default async function NewShortletPropertyPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "shortlet-properties:*"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Add property</h1>
      <NewPropertyForm estateSlug={estateSlug} />
    </div>
  );
}

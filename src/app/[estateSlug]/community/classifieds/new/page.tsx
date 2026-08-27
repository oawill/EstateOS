import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listClassifiedCategories } from "@/server/modules/community/settings";
import { NewListingForm } from "./NewListingForm";

export default async function NewListingPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;

  const categories = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "community-listings:*");
    return listClassifiedCategories(membership.estateId, true);
  });

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-medium">New listing</h2>
      <NewListingForm estateSlug={estateSlug} categories={categories.map((c) => ({ id: c.id, key: c.key, label: c.label }))} />
    </div>
  );
}

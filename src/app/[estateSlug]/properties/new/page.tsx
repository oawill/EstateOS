import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listBlocks, listStreets, listZones } from "@/server/modules/estates/service";
import { NewPropertyForm } from "../NewPropertyForm";

export default async function NewPropertyPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "properties:*"));

  const [blocks, streets, zones] = await Promise.all([
    listBlocks(membership.estateId),
    listStreets(membership.estateId),
    listZones(membership.estateId),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Add property</h1>
      <Card>
        <NewPropertyForm estateSlug={estateSlug} blocks={blocks} streets={streets} zones={zones} />
      </Card>
    </div>
  );
}

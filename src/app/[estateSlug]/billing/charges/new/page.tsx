import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listBlocks, listStreets } from "@/server/modules/estates/service";
import { listProperties } from "@/server/modules/properties/service";
import { NewChargeForm } from "../NewChargeForm";

export default async function NewChargePage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "charges:*"));

  const [blocks, streets, properties] = await Promise.all([
    listBlocks(membership.estateId),
    listStreets(membership.estateId),
    listProperties(membership.estateId),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Create charge</h1>
      <Card>
        <NewChargeForm
          estateSlug={estateSlug}
          blocks={blocks}
          streets={streets}
          properties={properties.map((p) => ({ id: p.id, addressLabel: p.addressLabel }))}
        />
      </Card>
    </div>
  );
}

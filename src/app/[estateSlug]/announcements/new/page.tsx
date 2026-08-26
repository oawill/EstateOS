import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { listBlocks, listStreets, listZones } from "@/server/modules/estates/service";
import { listProperties } from "@/server/modules/properties/service";
import { NewAnnouncementForm } from "../NewAnnouncementForm";

export default async function NewAnnouncementPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "announcements:*"));

  const [blocks, streets, zones, properties] = await Promise.all([
    listBlocks(membership.estateId),
    listStreets(membership.estateId),
    listZones(membership.estateId),
    listProperties(membership.estateId),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">New announcement</h1>
      <Card>
        <NewAnnouncementForm
          estateSlug={estateSlug}
          blocks={blocks}
          streets={streets}
          zones={zones}
          properties={properties.map((p) => ({ id: p.id, addressLabel: p.addressLabel }))}
        />
      </Card>
    </div>
  );
}

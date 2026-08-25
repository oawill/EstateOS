import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { countCurrentlyCheckedIn } from "@/server/modules/visitors/service";
import { GateModeClient } from "./GateModeClient";

export default async function GatePage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "visitors:verify"));

  const checkedInCount = await countCurrentlyCheckedIn(membership.estateId);

  return (
    <div className="mx-auto max-w-md">
      <GateModeClient estateSlug={estateSlug} initialCheckedIn={checkedInCount} />
    </div>
  );
}

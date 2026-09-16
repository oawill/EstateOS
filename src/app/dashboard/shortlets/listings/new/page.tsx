import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { listUnlistedUnits } from "@/server/modules/shortletManagement/operator";
import { NewListingForm } from "./ClientControls";

export default async function NewShortletListingPage({ searchParams }: { searchParams: Promise<{ unitId?: string }> }) {
  const user = await guardPage(() => requireUser());
  const { unitId } = await searchParams;
  const units = await listUnlistedUnits(user);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Create a Shortlet Listing</h1>
      <Card>
        <NewListingForm units={units} defaultUnitId={unitId} />
      </Card>
    </div>
  );
}

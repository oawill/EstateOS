import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { WalkInForm } from "./WalkInForm";

export default async function WalkInPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "gate:*"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Register Walk-In Visitor</h1>
        <p className="text-sm text-foreground-muted">
          This does not admit the visitor — it sends the host a request to approve them first.
        </p>
      </div>
      <Card>
        <WalkInForm estateSlug={estateSlug} />
      </Card>
    </div>
  );
}

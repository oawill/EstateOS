import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { prisma } from "@/server/db/client";
import { OnboardingStepper } from "../../OnboardingStepper";
import { GenerateHousesForm } from "./GenerateHousesForm";

export default async function StructurePage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "estate:*"));

  const propertyCount = await prisma.property.count({ where: { estateId: membership.estateId } });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <OnboardingStepper current="structure" />

      <h1 className="mt-6 text-xl font-semibold">How is your estate organized?</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Generate properties in bulk. You can always add, edit or import more later from the estate dashboard.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Badge tone={propertyCount > 0 ? "success" : "neutral"}>{propertyCount} properties so far</Badge>
      </div>

      <Card className="mt-4">
        <GenerateHousesForm estateSlug={estateSlug} />
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Link href={`/${estateSlug}/properties/new`} className="text-sm text-foreground-muted hover:underline">
          Add a single property manually →
        </Link>
        <Link href={`/onboarding/new-estate/${estateSlug}/residents`}>
          <Button>Continue</Button>
        </Link>
      </div>
    </main>
  );
}

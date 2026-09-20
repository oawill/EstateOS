import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { prisma } from "@/server/db/client";
import { OnboardingStepper } from "../../OnboardingStepper";
import { continueFromResidentsAction } from "./actions";

export default async function ResidentsStepPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "estate:*"));

  const [residentCount, propertyCount] = await Promise.all([
    prisma.resident.count({ where: { estateId: membership.estateId } }),
    prisma.property.count({ where: { estateId: membership.estateId } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <OnboardingStepper current="residents" />

      <h1 className="mt-6 text-xl font-semibold">Add your residents</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        You don&apos;t need every resident to continue — add a few now, or add and invite the rest anytime from the
        estate dashboard.
      </p>

      <div className="mt-4">
        <Badge tone={residentCount > 0 ? "success" : "neutral"}>{residentCount} residents added</Badge>
      </div>

      <Card className="mt-4 space-y-3">
        {propertyCount === 0 ? (
          <p className="text-sm text-foreground-muted">
            Add at least one property in the previous step before adding residents.
          </p>
        ) : (
          <Link href={`/${estateSlug}/residents/new`}>
            <Button variant="secondary" className="w-full">
              Add a resident
            </Button>
          </Link>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Link href={`/onboarding/new-estate/${estateSlug}/structure`} className="text-sm text-foreground-muted hover:underline">
          ← Back
        </Link>
        <form
          action={async () => {
            "use server";
            await continueFromResidentsAction(estateSlug);
          }}
        >
          <Button type="submit">{residentCount === 0 ? "Skip for now" : "Continue"}</Button>
        </form>
      </div>
    </main>
  );
}

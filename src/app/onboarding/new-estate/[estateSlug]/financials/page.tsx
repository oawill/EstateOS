import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { prisma } from "@/server/db/client";
import { getEstateLocale } from "@/server/modules/estates/service";
import { OnboardingStepper } from "../../OnboardingStepper";
import { FirstChargeForm } from "./FirstChargeForm";
import { skipFinancialsAction } from "./actions";

export default async function FinancialsStepPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "estate:*"));

  const [propertyCount, chargeCount, estateLocale] = await Promise.all([
    prisma.property.count({ where: { estateId: membership.estateId } }),
    prisma.charge.count({ where: { estateId: membership.estateId } }),
    getEstateLocale(membership.estateId),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <OnboardingStepper current="financials" />

      <h1 className="mt-6 text-xl font-semibold">How does your estate collect charges?</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Set up your first service charge now, or configure this later — more charge types, per-property-type rates
        and other levies can all be added from the Billing dashboard afterwards.
      </p>

      <div className="mt-4">
        <Badge tone={chargeCount > 0 ? "success" : "neutral"}>{chargeCount} charges configured</Badge>
      </div>

      <Card className="mt-4">
        {propertyCount === 0 ? (
          <p className="text-sm text-foreground-muted">Add properties in an earlier step before creating a charge.</p>
        ) : (
          <FirstChargeForm
            estateSlug={estateSlug}
            propertyCount={propertyCount}
            currency={estateLocale.currency}
            locale={estateLocale.locale}
          />
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Link href={`/onboarding/new-estate/${estateSlug}/residents`} className="text-sm text-foreground-muted hover:underline">
          ← Back
        </Link>
        {chargeCount > 0 ? (
          <Link href={`/onboarding/new-estate/${estateSlug}/review`}>
            <Button>Continue</Button>
          </Link>
        ) : (
          <form
            action={async () => {
              "use server";
              await skipFinancialsAction(estateSlug);
            }}
          >
            <Button type="submit" variant="secondary">
              Set up later
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { getOnboardingReview } from "@/server/modules/onboarding/service";
import { OnboardingStepper } from "../../OnboardingStepper";
import { launchEstateAction } from "./actions";

export default async function ReviewStepPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "estate:*"));

  const review = await getOnboardingReview(membership.estateId);

  const checklist: { label: string; ok: boolean; warn?: boolean }[] = [
    { label: "Estate created", ok: true },
    {
      label: review.propertyCount > 0 ? `${review.propertyCount} properties (${review.unitCount} units)` : "No properties added yet",
      ok: review.propertyCount > 0,
      warn: review.propertyCount === 0,
    },
    {
      label: review.residentCount > 0 ? `${review.residentCount} residents added` : "Residents skipped for now",
      ok: review.residentCount > 0,
      warn: review.residentCount === 0,
    },
    {
      label: review.chargeCount > 0 ? `${review.chargeCount} service charge(s) configured` : "Financial setup skipped for now",
      ok: review.chargeCount > 0,
      warn: review.chargeCount === 0,
    },
  ];
  if (review.residentsMissingContact > 0) {
    checklist.push({
      label: `${review.residentsMissingContact} residents missing email or phone`,
      ok: false,
      warn: true,
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <OnboardingStepper current="review" />

      <h1 className="mt-6 text-xl font-semibold">Your estate is almost ready</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Review what&apos;s configured so far. Warnings won&apos;t stop you from launching — you can keep improving
        setup afterwards from the estate dashboard.
      </p>

      <Card className="mt-4 space-y-2">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className={item.ok ? "text-success" : item.warn ? "text-warning" : "text-danger"}>
              {item.ok ? "✓" : "!"}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Link href={`/onboarding/new-estate/${estateSlug}/financials`} className="text-sm text-foreground-muted hover:underline">
          ← Back
        </Link>
        <form
          action={async () => {
            "use server";
            await launchEstateAction(estateSlug);
          }}
        >
          <Button type="submit">Launch NidraQ for Your Estate</Button>
        </form>
      </div>

      <p className="mt-3 text-center">
        <Badge tone="info">You can invite residents, add utilities and vendors anytime after launch</Badge>
      </p>
    </main>
  );
}

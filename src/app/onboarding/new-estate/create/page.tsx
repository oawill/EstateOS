import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { OnboardingStepper } from "../OnboardingStepper";
import { CreateEstateForm } from "./CreateEstateForm";

export default async function CreateEstatePage() {
  await guardPage(() => requireUser());

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <OnboardingStepper current="estate" />
      <h1 className="mt-6 text-xl font-semibold">Tell us about your estate</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        You&apos;ll be added as the estate administrator. Properties, residents and financial setup come next.
      </p>
      <Card className="mt-6">
        <CreateEstateForm />
      </Card>
    </main>
  );
}

import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { NewEstateForm } from "./NewEstateForm";

export default async function NewEstatePage() {
  await guardPage(() => requireUser());

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold">Set up your estate</h1>
      <p className="mt-1 text-sm text-slate-500">
        You&apos;ll be added as the estate administrator. Blocks, properties, and residents come next.
      </p>
      <Card className="mt-6">
        <NewEstateForm />
      </Card>
    </main>
  );
}

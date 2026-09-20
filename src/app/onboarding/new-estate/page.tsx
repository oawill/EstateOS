import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { findResumableOnboardingRoute } from "@/server/modules/onboarding/service";

export default async function OnboardingWelcomePage() {
  const user = await guardPage(() => requireUser());
  const resumeRoute = await findResumableOnboardingRoute(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="text-2xl font-semibold">Welcome to NidraQ</h1>
        <p className="mt-2 text-foreground-muted">Let&apos;s set up your estate.</p>
        <p className="mt-4 text-sm text-foreground-muted">
          We&apos;ll guide you through properties, residents, payments, security and estate operations.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {resumeRoute ? (
            <>
              <Link href={resumeRoute}>
                <Button className="w-full">Continue Setup</Button>
              </Link>
              <Link href="/onboarding/new-estate/create" className="text-center text-sm text-foreground-muted hover:underline">
                Set up a different estate instead
              </Link>
            </>
          ) : (
            <Link href="/onboarding/new-estate/create">
              <Button className="w-full">Start Setup</Button>
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
}

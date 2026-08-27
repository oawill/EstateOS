import Image from "next/image";
import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";
import { getDemoRequestByReference } from "@/server/modules/demoRequests/service";

export default async function DemoRequestSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const lookup = ref ? await getDemoRequestByReference(ref) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <Image src="/logo.svg" alt="NidraQ" width={40} height={40} className="rounded-lg" priority />
      <Card className="mt-6 w-full">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <h1 className="mt-4 text-xl font-semibold">Demo request received.</h1>
        {lookup && <p className="mt-1 text-sm font-medium">Thanks, {lookup.firstName}.</p>}
        <p className="mt-2 text-sm text-foreground-muted">
          We&apos;ve received your NidraQ demo request. Our team will review your requirements and contact you to
          confirm the session.
        </p>
        {ref && (
          <p className="mt-4 rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium">
            Reference number: <span className="font-mono">{ref}</span>
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Return to NidraQ
            </Button>
          </Link>
          {lookup?.wantsShortlet && (
            <Link href="/#shortlet">
              <Button type="button" className="w-full sm:w-auto">
                Explore NidraQ Shortlet
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
}

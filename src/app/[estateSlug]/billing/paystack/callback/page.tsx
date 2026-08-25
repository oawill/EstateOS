import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";

// Paystack redirects the browser here after checkout. This page never marks
// anything paid itself — that's only ever done by the signature-verified
// webhook (see api/webhooks/paystack/route.ts) — so it just tells the
// resident to check their bill status rather than trusting its own query
// params.
export default async function PaystackCallbackPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "own-payments:*"));

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <Card className="text-center">
        <h1 className="text-lg font-semibold">Thanks — confirming your payment</h1>
        <p className="mt-2 text-sm text-slate-500">
          We&apos;re verifying your payment with Paystack. Your bill will update automatically once confirmed —
          usually within a few seconds.
        </p>
        <Link href={`/${estateSlug}/my/bills`}>
          <Button className="mt-6 w-full">Back to my bills</Button>
        </Link>
      </Card>
    </main>
  );
}

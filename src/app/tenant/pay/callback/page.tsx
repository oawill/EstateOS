import Link from "next/link";
import { Card, Button, Badge } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requireTenantSelf } from "@/server/modules/tenantManagement/access";
import { verifyTenantPaystackTransaction } from "@/server/modules/tenantManagement/paystack";

/**
 * The browser lands here straight from Paystack's checkout — but per the
 * "never trust a browser redirect alone" rule, this page doesn't treat
 * being here as proof of payment. It calls verifyTenantPaystackTransaction()
 * server-side, which asks Paystack directly; the actual ledger update only
 * ever happens inside that call (or, more commonly, has already happened
 * via the webhook by the time this page loads).
 */
export default async function TenantPaymentCallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  await guardPage(async () => requireTenantSelf(await requireUser()));
  const { reference, trxref } = await searchParams;
  const ref = reference || trxref;

  let outcome: "completed" | "already_completed" | "not_yet_successful" | "unknown_reference" | "error" = "error";
  if (ref) {
    try {
      const result = await verifyTenantPaystackTransaction(ref);
      outcome = result.status;
    } catch {
      outcome = "error";
    }
  }

  const copy: Record<typeof outcome, { title: string; tone: "success" | "warning" | "danger"; body: string }> = {
    completed: { title: "Payment confirmed", tone: "success", body: "Your payment has been verified and your rent balance updated." },
    already_completed: { title: "Payment confirmed", tone: "success", body: "This payment was already confirmed — your balance is up to date." },
    not_yet_successful: {
      title: "Still processing",
      tone: "warning",
      body: "We haven't received confirmation from Paystack yet. This can take a minute — check back shortly or contact your property manager if it doesn't update.",
    },
    unknown_reference: { title: "Payment not found", tone: "danger", body: "We couldn't find a matching payment for this reference." },
    error: { title: "Something went wrong", tone: "danger", body: "We couldn't verify this payment right now. Please contact your property manager." },
  };

  const { title, tone, body } = copy[outcome];

  return (
    <Card className="mx-auto max-w-md text-center">
      <Badge tone={tone}>{title}</Badge>
      <p className="mt-3 text-sm text-foreground-muted">{body}</p>
      <Link href="/tenant">
        <Button className="mt-4 w-full">Back to My Home</Button>
      </Link>
    </Card>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { formatDate, formatMoney } from "@/lib/utils";
import { DISPUTE_STATUS_TONE } from "@/lib/statusTones";
import { getDispute } from "@/server/modules/billing/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { DisputeResolutionForm } from "./DisputeResolutionForm";

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ estateSlug: string; disputeId: string }>;
}) {
  const { estateSlug, disputeId } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "disputes:*"));

  const [dispute, estateLocale] = await Promise.all([
    getDispute(membership.estateId, disputeId),
    getEstateLocale(membership.estateId),
  ]);
  if (!dispute) notFound();

  const money = (amountKobo: number) => formatMoney(amountKobo, estateLocale.currency, estateLocale.locale);
  const isTerminal = dispute.status === "RESOLVED" || dispute.status === "ADJUSTED" || dispute.status === "REJECTED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Questioned charge</h1>
        <Link href={`/${estateSlug}/billing`} className="text-sm font-medium text-primary hover:underline">
          ← Back to Billing
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">
              {dispute.resident.firstName} {dispute.resident.lastName}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Invoice {dispute.invoice.invoiceNumber} · {dispute.invoice.unit.property.addressLabel} ·{" "}
              {money(dispute.invoice.amountKobo)}
            </p>
            <p className="mt-3 text-sm">
              <span className="font-medium">Resident&apos;s question: </span>
              {dispute.reason}
            </p>
            <p className="mt-1 text-xs text-foreground-muted">Raised {formatDate(dispute.raisedAt)}</p>
            {dispute.resolutionNote && (
              <p className="mt-3 text-sm">
                <span className="font-medium">Resolution note: </span>
                {dispute.resolutionNote}
              </p>
            )}
          </div>
          <Badge tone={DISPUTE_STATUS_TONE[dispute.status]}>{dispute.status.replaceAll("_", " ")}</Badge>
        </div>
      </Card>

      {!isTerminal && (
        <DisputeResolutionForm estateSlug={estateSlug} disputeId={dispute.id} currentStatus={dispute.status} />
      )}
    </div>
  );
}

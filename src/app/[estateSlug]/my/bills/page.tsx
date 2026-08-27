import { Card } from "@/components/shared/ui";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listInvoicesForResident } from "@/server/modules/billing/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { InvoiceCard } from "./InvoiceCard";

export default async function MyBillsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "own-bills:read"));

  const resident = await guardPage(async () => {
    const { user } = await requireEstatePermission(estateSlug, "own-bills:read");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    return resident;
  });

  const [invoices, estateLocale] = await Promise.all([
    listInvoicesForResident(membership.estateId, resident.id),
    getEstateLocale(membership.estateId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My bills</h1>

      {invoices.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No bills yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              estateSlug={estateSlug}
              currency={estateLocale.currency}
              locale={estateLocale.locale}
              invoice={{
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                title: invoice.charge.title,
                amountKobo: invoice.amountKobo,
                dueDate: invoice.dueDate.toISOString(),
                status: invoice.status,
                receiptNumber: invoice.payments[0]?.receipt?.receiptNumber,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

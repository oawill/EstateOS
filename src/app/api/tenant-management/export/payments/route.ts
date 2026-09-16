import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listAccessiblePayments } from "@/server/modules/tenantManagement/payments";
import { toCsv } from "@/server/modules/tenantManagement/csv";

export async function GET() {
  const user = await requireUser();
  const propertyIds = await getAuthorizedPropertyIds(user);
  const payments = await listAccessiblePayments(propertyIds, 5000);

  const csv = toCsv(
    payments.map((p) => ({
      reference: p.referenceNumber,
      tenant: p.tenant.fullName,
      property: p.lease.unit.property.name,
      unit: p.lease.unit.label,
      amountMinor: p.amountMinor,
      method: p.method,
      status: p.status,
      paidAt: p.paidAt.toISOString(),
      transactionRef: p.transactionRef ?? "",
    })),
  );

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="rent_ledger.csv"' },
  });
}

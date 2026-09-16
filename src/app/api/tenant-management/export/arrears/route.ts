import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { getArrears } from "@/server/modules/tenantManagement/payments";
import { toCsv } from "@/server/modules/tenantManagement/csv";

/** CSV export always re-derives the caller's authorized property set server-side — never trusts a client-supplied filter to widen what's exported. */
export async function GET() {
  const user = await requireUser();
  const propertyIds = await getAuthorizedPropertyIds(user);
  const arrears = await getArrears(propertyIds);

  const csv = toCsv(
    arrears.rows.map((r) => ({
      tenant: r.tenant.fullName,
      property: r.property.name,
      unit: r.unit.label,
      amountDueMinor: r.amountDueMinor,
      amountPaidMinor: r.amountPaidMinor,
      outstandingMinor: r.outstandingMinor,
      dueDate: r.originalDueDate.toISOString().slice(0, 10),
      daysOverdue: r.daysOverdue,
      bucket: r.bucket,
    })),
  );

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="arrears.csv"' },
  });
}

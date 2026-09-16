import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requireTenantSelf } from "@/server/modules/tenantManagement/access";
import { getReceiptForTenant } from "@/server/modules/tenantManagement/receipts";
import { ReceiptView } from "@/components/shared/ReceiptView";

export default async function TenantReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { tenantId } = await guardPage(async () => requireTenantSelf(await requireUser()));
  const { paymentId } = await params;
  const payment = await guardPage(() => getReceiptForTenant(tenantId, paymentId));

  return <ReceiptView payment={payment} />;
}

import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getReceiptForLandlord } from "@/server/modules/tenantManagement/receipts";
import { ReceiptView } from "@/components/shared/ReceiptView";

export default async function LandlordReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const user = await guardPage(() => requireUser());
  const { paymentId } = await params;
  const payment = await guardPage(() => getReceiptForLandlord(user, paymentId));

  return <ReceiptView payment={payment} />;
}

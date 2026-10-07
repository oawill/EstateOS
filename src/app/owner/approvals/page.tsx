import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getOwnerAccessContext } from "@/server/modules/owner/access";
import { expenseAmountMinor, listPendingApprovalsForOwner } from "@/server/modules/tenantManagement/ownerApprovals";
import { formatDate, formatNaira } from "@/lib/utils";
import { ApprovalCard } from "./ApprovalCard";

export default async function OwnerApprovalsPage() {
  const user = await guardPage(() => requireUser());
  const access = await getOwnerAccessContext(user.id);

  const pending = access.ownerId ? await listPendingApprovalsForOwner(user) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Approvals</h1>
        <p className="mt-1 text-sm text-foreground-muted">Maintenance spending above your limit waits here for your decision.</p>
      </div>

      {pending.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">Nothing needs your approval</p>
          <p className="mt-1 text-sm text-foreground-muted">You&apos;re up to date.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((e) => (
            <ApprovalCard
              key={e.id}
              approval={{
                id: e.id,
                title: e.description,
                property: e.request.property.name,
                unit: e.request.unit.label,
                vendorName: e.vendorName,
                amountLabel: formatNaira(expenseAmountMinor(e)),
                requestedOn: formatDate(e.createdAt),
                comments: e.comments.map((c) => ({ id: c.id, role: c.role, author: c.author.name, body: c.body })),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

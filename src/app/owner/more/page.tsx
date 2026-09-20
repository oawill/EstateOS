import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { requirePropertyOwner } from "@/server/modules/tenantManagement/access";
import { getPayoutDetails } from "@/server/modules/tenantManagement/property";
import { signOut } from "@/server/auth/config";
import { PayoutDetailsForm } from "@/app/landlord/PayoutDetailsForm";

export default async function OwnerMorePage() {
  const { user, ownerId } = await guardPage(async () => requirePropertyOwner(await requireUser()));
  const payoutDetails = await getPayoutDetails(user, ownerId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">More</h1>

      <Card>
        <p className="text-sm font-medium">Payout details</p>
        <p className="mt-1 text-xs text-foreground-muted">Only visible to you — never shown in any property or tenant list.</p>
        <div className="mt-3">
          <PayoutDetailsForm ownerId={ownerId} current={payoutDetails} />
        </div>
      </Card>

      <Card>
        <p className="text-sm font-medium">Help &amp; support</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-foreground-muted">
            For property-specific questions, contact your property manager directly from the property page.
          </p>
          <a href="mailto:support@nidraq.com" className="block text-primary hover:underline">
            Email NidraQ Support
          </a>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-medium">Account</p>
        <p className="mt-1 text-sm text-foreground-muted">{user.name}</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-3"
        >
          <button type="submit" className="text-sm font-medium text-danger hover:underline">
            Sign out
          </button>
        </form>
      </Card>
    </div>
  );
}

import { Badge, Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { listHouseholdMembers } from "@/server/modules/household/service";
import { HOUSEHOLD_RELATIONSHIP_LABELS } from "@/server/modules/household/labels";
import { HouseholdForm } from "./HouseholdForm";
import { removeHouseholdMemberAction } from "./actions";

export default async function HouseholdPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { user, membership } = await guardPage(() => requireEstatePermission(estateSlug, "own-household:*"));
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  const members = await listHouseholdMembers(membership.estateId, resident.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Household</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          List the people who live or work in your home. Security can look up a name at the gate to confirm who they belong to. Phone numbers are never shown to security.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Add a person</h2>
        <div className="mt-3">
          <HouseholdForm estateSlug={estateSlug} />
        </div>
      </Card>

      <div className="space-y-3">
        {members.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">No one listed yet.</p>
          </Card>
        ) : (
          members.map((m) => (
            <Card key={m.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{m.fullName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="neutral">{HOUSEHOLD_RELATIONSHIP_LABELS[m.relationship]}</Badge>
                  {m.phone && <span className="text-xs text-foreground-muted">{m.phone}</span>}
                </div>
              </div>
              <form action={removeHouseholdMemberAction.bind(null, estateSlug, m.id)}>
                <Button type="submit" variant="danger" className="px-3 py-1.5 text-xs">
                  Remove
                </Button>
              </form>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { listGuests } from "@/server/modules/shortlet/guests";

export default async function ShortletGuestsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const guests = await guardPage(async () => {
    const { membership } = await requireEstatePermission(estateSlug, "shortlet-guests:*");
    return listGuests(membership.estateId);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Guests</h1>
        <Link href={`/${estateSlug}/shortlet/guests/new`}>
          <Button type="button">Add guest</Button>
        </Link>
      </div>

      {guests.length === 0 && (
        <Card>
          <p className="text-sm text-foreground-muted">No guests yet.</p>
        </Card>
      )}

      <div className="space-y-2">
        {guests.map((guest) => (
          <Link key={guest.id} href={`/${estateSlug}/shortlet/guests/${guest.id}`}>
            <Card className="py-3 transition-colors hover:bg-surface-muted">
              <p className="text-sm font-medium">{guest.fullName}</p>
              <p className="mt-0.5 text-xs text-foreground-muted">
                {guest.phone}
                {guest.email ? ` · ${guest.email}` : ""}
                {guest.country ? ` · ${guest.country}` : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

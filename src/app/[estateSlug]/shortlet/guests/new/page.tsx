import { guardPage } from "@/server/auth/pageGuard";
import { requireEstatePermission } from "@/server/auth/guards";
import { GuestForm } from "../GuestForm";

export default async function NewGuestPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "shortlet-guests:*"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Add guest</h1>
      <GuestForm estateSlug={estateSlug} />
    </div>
  );
}

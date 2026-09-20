import { redirect } from "next/navigation";
import { Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAdvertiserByUserId, listAdvertisingEnabledEstates } from "@/server/modules/advertising/service";
import { CreateCampaignForm } from "./CreateCampaignForm";

export default async function NewCampaignPage() {
  const user = await guardPage(() => requireUser());
  const advertiser = await getAdvertiserByUserId(user.id);
  if (!advertiser || !["APPROVED", "ACTIVE"].includes(advertiser.status)) {
    redirect("/advertiser");
  }

  const estates = await listAdvertisingEnabledEstates();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold">Create campaign</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Submitted campaigns are reviewed by NidraQ before they go live — you&apos;ll see the status update here.
      </p>
      <Card className="mt-6">
        <CreateCampaignForm estates={estates} />
      </Card>
    </main>
  );
}

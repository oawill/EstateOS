"use client";

import { Button } from "@/components/shared/ui";
import { pauseCampaignAction } from "./actions";

export function PauseCampaignButton({ campaignId, isPaused }: { campaignId: string; isPaused: boolean }) {
  return (
    <form
      action={async () => {
        await pauseCampaignAction(campaignId, !isPaused);
      }}
    >
      <Button type="submit" variant="secondary">
        {isPaused ? "Resume" : "Pause"}
      </Button>
    </form>
  );
}

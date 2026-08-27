"use client";

import type { EventRsvpStatus } from "@prisma/client";
import { Button } from "@/components/shared/ui";
import { setRsvpAction } from "../actions";

const OPTIONS: [EventRsvpStatus, string][] = [
  ["GOING", "Going"],
  ["INTERESTED", "Interested"],
  ["NOT_GOING", "Not going"],
];

export function RsvpButtons({ estateSlug, eventId, currentStatus }: { estateSlug: string; eventId: string; currentStatus?: EventRsvpStatus }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map(([status, label]) => (
        <form key={status} action={async () => setRsvpAction(estateSlug, eventId, status)}>
          <Button type="submit" variant={currentStatus === status ? "primary" : "secondary"}>
            {label}
          </Button>
        </form>
      ))}
    </div>
  );
}

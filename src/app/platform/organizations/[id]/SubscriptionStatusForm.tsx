"use client";

import type { SubscriptionStatus } from "@prisma/client";
import { Button, Select } from "@/components/shared/ui";
import { updateSubscriptionStatusAction } from "../actions";

const STATUSES: SubscriptionStatus[] = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"];

export function SubscriptionStatusForm({
  organizationId,
  subscriptionId,
  currentStatus,
}: {
  organizationId: string;
  subscriptionId: string;
  currentStatus: SubscriptionStatus;
}) {
  return (
    <form
      action={async (formData) => {
        await updateSubscriptionStatusAction(organizationId, subscriptionId, formData);
      }}
      className="flex items-center gap-2"
    >
      <Select name="status" defaultValue={currentStatus} className="w-auto text-xs">
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary">
        Update
      </Button>
    </form>
  );
}

"use client";

import type { OrganizationStatus } from "@prisma/client";
import { Button, Select } from "@/components/shared/ui";
import { updateOrganizationStatusAction } from "../actions";

const STATUSES: OrganizationStatus[] = ["LEAD", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED", "ARCHIVED"];

export function OrganizationStatusForm({ organizationId, currentStatus }: { organizationId: string; currentStatus: OrganizationStatus }) {
  return (
    <form
      action={async (formData) => {
        await updateOrganizationStatusAction(organizationId, formData);
      }}
      className="flex items-end gap-2"
    >
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-foreground-muted" htmlFor="status">
          Account status
        </label>
        <Select id="status" name="status" defaultValue={currentStatus}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary">
        Update
      </Button>
    </form>
  );
}

"use client";

import { Button, Card, Checkbox } from "@/components/shared/ui";
import { AD_CATEGORY_OPTIONS } from "@/server/modules/advertising/labels";
import { updateAdvertisingPolicyAction } from "./advertisingActions";

export function AdvertisingSection({
  estateSlug,
  policy,
}: {
  estateSlug: string;
  policy: { advertisingEnabled: boolean; blockedCategories: string[] };
}) {
  return (
    <Card>
      <h2 className="mb-1 font-medium">Advertising</h2>
      <p className="mb-3 text-xs text-foreground-muted">
        Off by default. Enabling this allows approved, clearly-labeled &quot;Sponsored&quot; cards to appear on the
        resident home feed and marketplace — never in security, payment or emergency flows.
      </p>
      <form
        action={async (formData) => {
          await updateAdvertisingPolicyAction(estateSlug, formData);
        }}
        className="space-y-3"
      >
        <Checkbox name="advertisingEnabled" label="Allow sponsored content for this estate" defaultChecked={policy.advertisingEnabled} />

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Blocked categories</p>
          <p className="mb-2 text-xs text-foreground-muted">Checked categories will never be shown to your residents, even if approved by NidraQ.</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {AD_CATEGORY_OPTIONS.map(([value, label]) => (
              <Checkbox key={value} name="blockedCategories" value={value} label={label} defaultChecked={policy.blockedCategories.includes(value)} />
            ))}
          </div>
        </div>

        <Button type="submit">Save advertising settings</Button>
      </form>
    </Card>
  );
}

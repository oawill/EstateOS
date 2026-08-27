"use client";

import { useActionState } from "react";
import { Badge, Button, Card, Checkbox, FormError, Textarea } from "@/components/shared/ui";
import { toggleCategoryAction, updateCommunitySettingsAction, type CommunitySettingsFormState } from "./communityActions";

const initialState: CommunitySettingsFormState = {};

export function CommunitySettingsSection({
  estateSlug,
  settings,
  categories,
}: {
  estateSlug: string;
  settings: { communityEnabled: boolean; classifiedsEnabled: boolean; listingsRequireApproval: boolean; guidelinesText: string | null };
  categories: { id: string; label: string; isActive: boolean }[];
}) {
  const action = updateCommunitySettingsAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <h2 className="mb-3 font-medium">Community</h2>
      <form action={formAction} className="space-y-3">
        <FormError message={state.error} />
        <Checkbox name="communityEnabled" label="Enable Community" defaultChecked={settings.communityEnabled} />
        <Checkbox name="classifiedsEnabled" label="Enable Classifieds" defaultChecked={settings.classifiedsEnabled} />
        <Checkbox name="listingsRequireApproval" label="New listings require admin approval before publishing" defaultChecked={settings.listingsRequireApproval} />
        <div>
          <label htmlFor="guidelinesText" className="mb-1.5 block text-sm font-medium text-foreground">
            Community guidelines
          </label>
          <Textarea id="guidelinesText" name="guidelinesText" rows={4} defaultValue={settings.guidelinesText ?? ""} placeholder="e.g. Respect other residents. No harassment. No illegal goods…" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save community settings"}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2 text-sm font-medium">Classifieds categories</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <form key={category.id} action={async () => toggleCategoryAction(estateSlug, category.id, !category.isActive)}>
              <button type="submit">
                <Badge tone={category.isActive ? "success" : "neutral"}>{category.label}</Badge>
              </button>
            </form>
          ))}
        </div>
      </div>
    </Card>
  );
}

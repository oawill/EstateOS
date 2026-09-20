"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, FormError } from "@/components/shared/ui";
import { activateOrganizationAction, type ActivateOrganizationFormState } from "../actions";

const MODULES = [
  ["ESTATE_MANAGEMENT", "Estate Management"],
  ["TENANT_MANAGEMENT", "Tenant Management"],
  ["SHORTLET_MANAGEMENT", "Shortlet Management"],
] as const;

const initial: ActivateOrganizationFormState = {};

export function ActivateOrganizationCard({
  demoRequestId,
  convertedOrganization,
  defaultModules,
}: {
  demoRequestId: string;
  convertedOrganization: { id: string; name: string } | null;
  defaultModules: (typeof MODULES)[number][0][];
}) {
  const action = activateOrganizationAction.bind(null, demoRequestId);
  const [state, formAction, pending] = useActionState(action, initial);

  if (convertedOrganization) {
    return (
      <Card>
        <h2 className="mb-2 font-medium">Organization</h2>
        <p className="text-sm text-foreground-muted">This lead has already been activated as a commercial organization.</p>
        <Link href={`/platform/organizations/${convertedOrganization.id}`} className="mt-2 inline-block text-sm text-primary hover:underline">
          View {convertedOrganization.name} →
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-2 font-medium">Activate customer</h2>
      <p className="mb-3 text-xs text-foreground-muted">
        Creates a commercial Organization from this lead with a trial subscription for the selected modules, and
        marks this demo request Customer.
      </p>
      <form action={formAction} className="space-y-3">
        <FormError message={state.error} />
        <div className="flex flex-wrap gap-4">
          {MODULES.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="modules" value={value} defaultChecked={defaultModules.includes(value)} />
              {label}
            </label>
          ))}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Activating…" : "Activate as Organization"}
        </Button>
      </form>
    </Card>
  );
}

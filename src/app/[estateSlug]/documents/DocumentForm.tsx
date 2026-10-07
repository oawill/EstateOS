"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { DOCUMENT_CATEGORY_LABELS } from "@/server/modules/documents/labels";
import { addDocumentAction, type DocumentFormState } from "./actions";

const initialState: DocumentFormState = {};

export function DocumentForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(addDocumentAction.bind(null, estateSlug), initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      {state.saved && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Document added.</p>}
      <div>
        <Label htmlFor="doc-title">Title</Label>
        <Input id="doc-title" name="title" required placeholder="Estate rules and regulations 2026" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="doc-category">Category</Label>
          <Select id="doc-category" name="category" defaultValue="RULES_AND_BYLAWS">
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="doc-url">Link</Label>
          <Input id="doc-url" name="url" type="url" required placeholder="https://…" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add document"}
      </Button>
    </form>
  );
}

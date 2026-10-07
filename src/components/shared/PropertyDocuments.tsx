"use client";

import { useActionState } from "react";
import { Badge, Button, Card, FormError, Input, Label, Select } from "@/components/shared/ui";
import { PROPERTY_DOCUMENT_CATEGORY_LABELS as CATEGORY_LABELS } from "@/server/modules/tenantManagement/propertyDocumentLabels";
import { addPropertyDocumentAction, removePropertyDocumentAction, type PropertyDocumentFormState } from "@/app/property-documents/actions";

export interface PropertyDocumentRow {
  id: string;
  title: string;
  category: string;
  url: string;
}

const initialState: PropertyDocumentFormState = {};

/** Shared by the owner's property page and the manager's property list. Links only: the files stay wherever they are stored. */
export function PropertyDocuments({ propertyId, documents }: { propertyId: string; documents: PropertyDocumentRow[] }) {
  const [state, formAction, pending] = useActionState(addPropertyDocumentAction.bind(null, propertyId), initialState);

  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">No documents added for this property yet.</p>
        </Card>
      ) : (
        documents.map((d) => (
          <Card key={d.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary hover:underline">
                {d.title}
              </a>
              <Badge tone="neutral">{CATEGORY_LABELS[d.category] ?? d.category}</Badge>
            </div>
            <form action={removePropertyDocumentAction.bind(null, propertyId, d.id)}>
              <Button type="submit" variant="danger" className="px-3 py-1.5 text-xs">
                Remove
              </Button>
            </form>
          </Card>
        ))
      )}

      <Card>
        <p className="text-sm font-medium">Add a document link</p>
        <form action={formAction} className="mt-3 space-y-3">
          <FormError message={state.error} />
          {state.saved && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Document added.</p>}
          <div>
            <Label htmlFor={`pd-title-${propertyId}`}>Title</Label>
            <Input id={`pd-title-${propertyId}`} name="title" required placeholder="Insurance policy 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`pd-cat-${propertyId}`}>Category</Label>
              <Select id={`pd-cat-${propertyId}`} name="category" defaultValue="LEASE_AGREEMENT">
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`pd-url-${propertyId}`}>Link</Label>
              <Input id={`pd-url-${propertyId}`} name="url" type="url" required placeholder="https://…" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding…" : "Add document"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

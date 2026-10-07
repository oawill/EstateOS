import { Role } from "@prisma/client";
import { Button, Card } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireEstateMember } from "@/server/auth/session";
import { listEstateDocuments } from "@/server/modules/documents/service";
import { DOCUMENT_CATEGORY_LABELS } from "@/server/modules/documents/labels";
import { DocumentForm } from "./DocumentForm";
import { removeDocumentAction } from "./actions";

export default async function DocumentsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstateMember(estateSlug));
  const isAdmin = membership.role === Role.ESTATE_ADMIN;

  const documents = await listEstateDocuments(membership.estateId);
  const byCategory = Object.keys(DOCUMENT_CATEGORY_LABELS)
    .map((key) => ({ key, label: DOCUMENT_CATEGORY_LABELS[key], items: documents.filter((d) => d.category === key) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Estate documents</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {isAdmin ? "Share rules, minutes and forms with residents by link." : "Rules, minutes and forms shared by your estate."}
        </p>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="mb-3 font-medium">Add a document</h2>
          <DocumentForm estateSlug={estateSlug} />
        </Card>
      )}

      {byCategory.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-muted">No documents have been shared yet.</p>
        </Card>
      ) : (
        byCategory.map((group) => (
          <section key={group.key} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">{group.label}</h2>
            {group.items.map((d) => (
              <Card key={d.id} className="flex items-center justify-between gap-3">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                  {d.title}
                </a>
                {isAdmin && (
                  <form
                    action={async () => {
                      "use server";
                      await removeDocumentAction(estateSlug, d.id);
                    }}
                  >
                    <Button type="submit" variant="secondary">
                      Remove
                    </Button>
                  </form>
                )}
              </Card>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

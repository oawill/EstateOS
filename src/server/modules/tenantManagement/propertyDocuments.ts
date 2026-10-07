import type { PropertyDocumentCategory } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { normalizeDocumentUrl } from "@/server/modules/documents/service";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { PROPERTY_DOCUMENT_CATEGORY_LABELS } from "./propertyDocumentLabels";

/** The property's owner or an assigned manager (never a tenant or another landlord) can list, add and remove its documents. */
export async function listPropertyDocuments(actor: CurrentUser, propertyId: string) {
  await assertPropertyAccess(actor, propertyId);
  return prisma.propertyDocument.findMany({ where: { propertyId }, orderBy: [{ category: "asc" }, { createdAt: "desc" }] });
}

export async function addPropertyDocument(actor: CurrentUser, propertyId: string, input: { title: string; category: PropertyDocumentCategory; url: string }) {
  await assertPropertyAccess(actor, propertyId);
  const title = input.title.trim();
  if (title.length < 2 || title.length > 120) throw new ForbiddenError("Give the document a title.");
  if (!Object.keys(PROPERTY_DOCUMENT_CATEGORY_LABELS).includes(input.category)) throw new ForbiddenError("Choose a category.");

  const document = await prisma.propertyDocument.create({
    data: { propertyId, title, category: input.category, url: normalizeDocumentUrl(input.url), addedByUserId: actor.id },
  });
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.property_document.added",
    entityType: "PropertyDocument",
    entityId: document.id,
    after: { propertyId, title, category: input.category },
  });
  return document;
}

export async function removePropertyDocument(actor: CurrentUser, documentId: string) {
  const document = await prisma.propertyDocument.findUnique({ where: { id: documentId } });
  if (!document) throw new NotFoundError("Document");
  await assertPropertyAccess(actor, document.propertyId);

  await prisma.propertyDocument.delete({ where: { id: document.id } });
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.property_document.removed",
    entityType: "PropertyDocument",
    entityId: document.id,
    before: { propertyId: document.propertyId, title: document.title, category: document.category },
  });
}

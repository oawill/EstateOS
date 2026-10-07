import type { EstateDocumentCategory } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";

/** Only plain web links — never javascript:, data: or other schemes that could run code when clicked. */
export function normalizeDocumentUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ForbiddenError("Enter a full link starting with https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ForbiddenError("Only web links (http/https) are allowed.");
  return url.toString();
}

export async function addEstateDocument(
  estateId: string,
  actorUserId: string,
  input: { title: string; category: EstateDocumentCategory; url: string },
) {
  const document = await prisma.estateDocument.create({
    data: { estateId, uploadedByUserId: actorUserId, title: input.title, category: input.category, url: normalizeDocumentUrl(input.url) },
  });
  await recordAudit({ estateId, actorUserId, action: "document.added", entityType: "EstateDocument", entityId: document.id, after: document });
  return document;
}

export async function listEstateDocuments(estateId: string) {
  return prisma.estateDocument.findMany({ where: { estateId }, orderBy: [{ category: "asc" }, { createdAt: "desc" }] });
}

export async function removeEstateDocument(estateId: string, actorUserId: string, documentId: string) {
  const before = await prisma.estateDocument.findFirst({ where: { id: documentId, estateId } });
  if (!before) throw new NotFoundError("Document");
  await prisma.estateDocument.delete({ where: { id: before.id } });
  await recordAudit({ estateId, actorUserId, action: "document.removed", entityType: "EstateDocument", entityId: before.id, before });
}

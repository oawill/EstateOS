import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { assignPropertyManager, createManagedProperty, createOrGetOwnProfile } from "../property";
import { addPropertyDocument, listPropertyDocuments, removePropertyDocument } from "../propertyDocuments";

function actorFor(userId: string): CurrentUser {
  return { id: userId, email: null, name: "Test User", isPlatformAdmin: false };
}

async function makeOwner(label: string, managerEmail?: string) {
  const user = await prisma.user.create({ data: { name: `owner-${label}`, email: `pd-${label}-${randomUUID()}@example.com` } });
  const owner = await createOrGetOwnProfile(user.id, { name: "Owner", preferredCurrency: "NGN" });
  const actor = actorFor(user.id);
  const property = await createManagedProperty(actor, { ownerId: owner.id, name: `Property ${label}`, addressLine: "1 Test St", city: "Lagos", country: "NG", propertyType: "FLAT" });
  if (managerEmail) await assignPropertyManager(actor, property.id, managerEmail);
  return { user, actor, property };
}

describe("Property documents (integration)", () => {
  const cleanup: string[] = [];
  afterAll(async () => {
    for (const id of cleanup) await prisma.user.deleteMany({ where: { id } });
  });

  it("lets the owner and an assigned manager add, list and remove documents, with web links only", async () => {
    const managerEmail = `pd-manager-${randomUUID()}@example.com`;
    const manager = await prisma.user.create({ data: { name: "Manager", email: managerEmail } });
    const a = await makeOwner("a", managerEmail);
    cleanup.push(a.user.id, manager.id);

    const doc = await addPropertyDocument(a.actor, a.property.id, { title: "Insurance 2026", category: "INSURANCE", url: "https://example.com/policy.pdf" });
    const byManager = await addPropertyDocument(actorFor(manager.id), a.property.id, { title: "Inspection", category: "INSPECTION_REPORT", url: "https://example.com/inspection" });

    expect((await listPropertyDocuments(actorFor(manager.id), a.property.id)).map((d) => d.id).sort()).toEqual([doc.id, byManager.id].sort());
    await expect(addPropertyDocument(a.actor, a.property.id, { title: "Bad", category: "OTHER", url: "javascript:alert(1)" })).rejects.toThrow(ForbiddenError);

    await removePropertyDocument(actorFor(manager.id), doc.id);
    expect((await listPropertyDocuments(a.actor, a.property.id)).map((d) => d.id)).toEqual([byManager.id]);

    const audits = await prisma.auditLog.count({ where: { entityType: "PropertyDocument", entityId: { in: [doc.id, byManager.id] } } });
    expect(audits).toBeGreaterThanOrEqual(3);
  });

  it("never lets another owner list, add to or remove from someone else's property", async () => {
    const a = await makeOwner("iso-a");
    const b = await makeOwner("iso-b");
    cleanup.push(a.user.id, b.user.id);
    const doc = await addPropertyDocument(a.actor, a.property.id, { title: "Title deed", category: "TITLE_AND_OWNERSHIP", url: "https://example.com/deed" });

    await expect(listPropertyDocuments(b.actor, a.property.id)).rejects.toThrow(NotFoundError);
    await expect(addPropertyDocument(b.actor, a.property.id, { title: "Nope", category: "OTHER", url: "https://example.com/x" })).rejects.toThrow(NotFoundError);
    await expect(removePropertyDocument(b.actor, doc.id)).rejects.toThrow(NotFoundError);
    expect(await listPropertyDocuments(a.actor, a.property.id)).toHaveLength(1);
  });
});

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { addEstateDocument, listEstateDocuments, normalizeDocumentUrl, removeEstateDocument } from "../service";

describe("Estate documents (integration)", () => {
  let estateId: string;
  let otherEstateId: string;
  let userId: string;

  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { name: "Admin", email: `docs-${randomUUID()}@example.com` } })).id;
    estateId = (await prisma.estate.create({ data: { name: "Docs Estate", slug: `docs-${randomUUID()}` } })).id;
    otherEstateId = (await prisma.estate.create({ data: { name: "Other Docs Estate", slug: `docs-other-${randomUUID()}` } })).id;
  });

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: [estateId, otherEstateId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("only accepts plain web links — never script or data URLs", () => {
    expect(normalizeDocumentUrl("https://example.com/rules.pdf")).toBe("https://example.com/rules.pdf");
    expect(() => normalizeDocumentUrl("javascript:alert(1)")).toThrow(ForbiddenError);
    expect(() => normalizeDocumentUrl("data:text/html,<script>1</script>")).toThrow(ForbiddenError);
    expect(() => normalizeDocumentUrl("not a url")).toThrow(ForbiddenError);
  });

  it("lists documents per estate and refuses to remove another estate's document", async () => {
    const doc = await addEstateDocument(estateId, userId, { title: "Rules", category: "RULES_AND_BYLAWS", url: "https://example.com/rules" });

    expect((await listEstateDocuments(estateId)).map((d) => d.id)).toContain(doc.id);
    expect(await listEstateDocuments(otherEstateId)).toHaveLength(0);

    await expect(removeEstateDocument(otherEstateId, userId, doc.id)).rejects.toThrow(NotFoundError);
    await removeEstateDocument(estateId, userId, doc.id);
    expect(await listEstateDocuments(estateId)).toHaveLength(0);
  });
});

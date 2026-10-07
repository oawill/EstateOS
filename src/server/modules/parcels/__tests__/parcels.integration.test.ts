import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { countAwaitingParcelsForResident, listAwaitingParcels, listParcelsForResident, logParcel, markParcelCollected } from "../service";

describe("Parcels (integration)", () => {
  let estateId: string;
  let otherEstateId: string;
  let userId: string;
  let residentId: string;
  let otherResidentId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { name: "Gate Officer", email: `parcel-${randomUUID()}@example.com` } });
    userId = user.id;
    const estate = await prisma.estate.create({ data: { name: "Parcel Estate", slug: `parcel-${randomUUID()}` } });
    const other = await prisma.estate.create({ data: { name: "Other Parcel Estate", slug: `parcel-other-${randomUUID()}` } });
    estateId = estate.id;
    otherEstateId = other.id;
    residentId = (await prisma.resident.create({ data: { estateId, firstName: "Ada", lastName: "Resident" } })).id;
    otherResidentId = (await prisma.resident.create({ data: { estateId: otherEstateId, firstName: "Bayo", lastName: "Other" } })).id;
  });

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: [estateId, otherEstateId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("logs a parcel, shows it only to the right resident and estate, and counts it as awaiting", async () => {
    const parcel = await logParcel(estateId, userId, { residentId, description: "Large brown box", carrier: "DHL" });
    expect(parcel.status).toBe("AWAITING_COLLECTION");

    expect(await countAwaitingParcelsForResident(estateId, residentId)).toBe(1);
    expect((await listParcelsForResident(estateId, residentId)).map((p) => p.id)).toContain(parcel.id);
    expect((await listAwaitingParcels(estateId)).map((p) => p.id)).toContain(parcel.id);
    expect(await listAwaitingParcels(otherEstateId)).toHaveLength(0);
  });

  it("refuses to log a parcel for a resident from a different estate", async () => {
    await expect(logParcel(estateId, userId, { residentId: otherResidentId, description: "Box" })).rejects.toThrow(NotFoundError);
  });

  it("closes a parcel out once, records who collected it, and blocks cross-estate or repeat closing", async () => {
    const parcel = await logParcel(estateId, userId, { residentId, description: "Envelope" });

    await expect(markParcelCollected(otherEstateId, userId, parcel.id)).rejects.toThrow(NotFoundError);

    const done = await markParcelCollected(estateId, userId, parcel.id, "Her driver");
    expect(done.status).toBe("COLLECTED");
    expect(done.collectedByName).toBe("Her driver");
    expect(done.collectedAt).not.toBeNull();

    await expect(markParcelCollected(estateId, userId, parcel.id)).rejects.toThrow(ForbiddenError);
  });
});

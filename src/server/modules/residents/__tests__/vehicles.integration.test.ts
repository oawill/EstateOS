import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { addVehicle, listVehiclesForResident, removeVehicle } from "../service";

describe("Resident vehicles (integration)", () => {
  let estateId: string;
  let residentAId: string;
  let residentBId: string;
  let actorUserId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Vehicle Test Estate", slug: `vehicle-test-${randomUUID()}` } });
    estateId = estate.id;
    const user = await prisma.user.create({ data: { name: "Actor", email: `vehicle-actor-${randomUUID()}@example.com` } });
    actorUserId = user.id;
    const residentA = await prisma.resident.create({ data: { estateId, firstName: "Resident", lastName: "A" } });
    const residentB = await prisma.resident.create({ data: { estateId, firstName: "Resident", lastName: "B" } });
    residentAId = residentA.id;
    residentBId = residentB.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: actorUserId } });
  });

  it("adds and lists a resident's own vehicles", async () => {
    await addVehicle(estateId, actorUserId, residentAId, { plateNumber: "LND-234-XY", make: "Toyota" });
    const vehicles = await listVehiclesForResident(estateId, residentAId);
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].plateNumber).toBe("LND-234-XY");
  });

  it("prevents one resident from removing another resident's vehicle (IDOR protection)", async () => {
    const vehicle = await addVehicle(estateId, actorUserId, residentBId, { plateNumber: "ABJ-999-ZZ" });

    await expect(removeVehicle(estateId, actorUserId, residentAId, vehicle.id)).rejects.toThrow(NotFoundError);

    const stillThere = await listVehiclesForResident(estateId, residentBId);
    expect(stillThere.some((v) => v.id === vehicle.id)).toBe(true);
  });

  it("removes a vehicle that actually belongs to the resident", async () => {
    const vehicle = await addVehicle(estateId, actorUserId, residentAId, { plateNumber: "KAN-111-QQ" });
    await removeVehicle(estateId, actorUserId, residentAId, vehicle.id);

    const remaining = await listVehiclesForResident(estateId, residentAId);
    expect(remaining.some((v) => v.id === vehicle.id)).toBe(false);
  });
});

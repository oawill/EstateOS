import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CreateResidentInput, CreateVehicleInput } from "./schema";

const residentWithRelations = Prisma.validator<Prisma.ResidentDefaultArgs>()({
  include: {
    occupancies: { where: { isCurrent: true }, include: { unit: { include: { property: true } } } },
    vehicles: true,
  },
});
type ResidentWithRelations = Prisma.ResidentGetPayload<typeof residentWithRelations>;

export async function listResidents(estateId: string) {
  return scoped(estateId).resident.findMany<ResidentWithRelations>({
    orderBy: { createdAt: "desc" },
    include: residentWithRelations.include,
  });
}

/** The Resident profile linked to a logged-in user, scoped to one estate. */
export async function getResidentByUserId(estateId: string, userId: string) {
  return scoped(estateId).resident.findMany({ where: { userId } as never }).then((rows) => rows[0] ?? null);
}

/**
 * Creates a Resident and their current Occupancy together. The unit is
 * re-verified against this estate here (not just trusted from the form)
 * so a crafted unitId from another tenant can't attach an occupancy to it.
 */
export async function createResidentWithOccupancy(
  estateId: string,
  actorUserId: string,
  input: CreateResidentInput,
) {
  const unit = await scoped(estateId).unit.findById(input.unitId);
  if (!unit) throw new NotFoundError("Unit");

  const { resident, occupancy } = await prisma.$transaction(async (tx) => {
    const resident = await tx.resident.create({
      data: {
        estateId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
        emergencyContactName: input.emergencyContactName || null,
        emergencyContactPhone: input.emergencyContactPhone || null,
      },
    });

    const occupancy = await tx.occupancy.create({
      data: {
        unitId: unit.id,
        residentId: resident.id,
        role: input.occupancyRole,
        moveInDate: input.moveInDate,
      },
    });

    await tx.unit.update({ where: { id: unit.id }, data: { occupancyStatus: "OCCUPIED" } });

    return { resident, occupancy };
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "resident.created",
    entityType: "Resident",
    entityId: resident.id,
    after: { resident, occupancy },
  });

  return resident;
}

/** Ends a resident's current occupancy and frees the unit if it was the only current occupant. */
export async function moveOutResident(estateId: string, actorUserId: string, occupancyId: string) {
  const occupancy = await prisma.occupancy.findFirst({
    where: { id: occupancyId, resident: { estateId } },
    include: { unit: true },
  });
  if (!occupancy) throw new NotFoundError("Occupancy");

  await prisma.$transaction(async (tx) => {
    await tx.occupancy.update({
      where: { id: occupancy.id },
      data: { isCurrent: false, moveOutDate: new Date() },
    });

    const remaining = await tx.occupancy.count({
      where: { unitId: occupancy.unitId, isCurrent: true, id: { not: occupancy.id } },
    });
    if (remaining === 0) {
      await tx.unit.update({ where: { id: occupancy.unitId }, data: { occupancyStatus: "VACANT" } });
    }
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "occupancy.moved_out",
    entityType: "Occupancy",
    entityId: occupancy.id,
    before: occupancy,
  });
}

export async function addVehicle(
  estateId: string,
  actorUserId: string,
  residentId: string,
  input: CreateVehicleInput,
) {
  const resident = await scoped(estateId).resident.findById(residentId);
  if (!resident) throw new NotFoundError("Resident");

  const vehicle = await scoped(estateId).vehicle.create({ ...input, residentId });

  await recordAudit({
    estateId,
    actorUserId,
    action: "vehicle.created",
    entityType: "Vehicle",
    entityId: vehicle.id,
    after: vehicle,
  });

  return vehicle;
}

/** Gate lookup by plate — deliberately returns only what security needs to authorize entry (owner name + unit), never the resident's other records. */
export async function findVehicleByPlate(estateId: string, plateNumber: string) {
  const plate = plateNumber.trim();
  if (!plate) return null;

  return scoped(estateId).vehicle.findMany<{
    id: string;
    plateNumber: string;
    make: string | null;
    model: string | null;
    color: string | null;
    resident: { firstName: string; lastName: string; occupancies: { unit: { label: string; property: { addressLabel: string } } }[] };
  }>({
    where: { plateNumber: { equals: plate, mode: "insensitive" } } as never,
    include: { resident: { include: { occupancies: { where: { isCurrent: true }, include: { unit: { include: { property: true } } } } } } } as never,
  }).then((rows) => rows[0] ?? null);
}

export async function listVehiclesForResident(estateId: string, residentId: string) {
  return scoped(estateId).vehicle.findMany({ where: { residentId } as never, orderBy: { createdAt: "desc" } as never });
}

/** Verifies the vehicle belongs to this resident (not just this estate) before removing it — a resident must never be able to remove another resident's vehicle by guessing its id. */
export async function removeVehicle(estateId: string, actorUserId: string, residentId: string, vehicleId: string) {
  const vehicle = await scoped(estateId).vehicle.findById<{ id: string; residentId: string }>(vehicleId);
  if (!vehicle || vehicle.residentId !== residentId) throw new NotFoundError("Vehicle");

  await scoped(estateId).vehicle.remove(vehicleId);

  await recordAudit({
    estateId,
    actorUserId,
    action: "vehicle.removed",
    entityType: "Vehicle",
    entityId: vehicleId,
    before: vehicle,
  });
}

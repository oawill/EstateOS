import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { formatSequenceCode, nextSequenceNumber } from "@/server/modules/sequence";
import { currentBillableResidentId } from "@/server/modules/billing/service";
import type { CreateMeterInput, RecordReadingInput } from "./schema";

const DUE_DAYS = 14;

export function computeUtilityAmount(previousReading: number, currentReading: number, rateKobo: number) {
  const consumption = currentReading - previousReading;
  if (consumption < 0) {
    throw new Error("The current reading can't be lower than the previous reading");
  }
  return { consumption, amountKobo: consumption * rateKobo };
}

export async function createMeter(estateId: string, actorUserId: string, input: CreateMeterInput) {
  const unit = await scoped(estateId).unit.findById(input.unitId);
  if (!unit) throw new NotFoundError("Unit");

  const meter = await scoped(estateId).utilityMeter.create({
    unitId: input.unitId,
    utilityType: input.utilityType,
    meterNumber: input.meterNumber,
    rateKobo: input.rateKobo,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "utility.meter_created",
    entityType: "UtilityMeter",
    entityId: meter.id,
    after: meter,
  });

  return meter;
}

const meterWithRelations = Prisma.validator<Prisma.UtilityMeterDefaultArgs>()({
  include: {
    unit: { include: { property: true } },
    readings: { orderBy: { createdAt: "desc" }, take: 1, include: { bill: true } },
  },
});
export type MeterWithRelations = Prisma.UtilityMeterGetPayload<typeof meterWithRelations>;

export async function listMeters(estateId: string) {
  return scoped(estateId).utilityMeter.findMany<MeterWithRelations>({
    orderBy: { createdAt: "desc" },
    include: meterWithRelations.include,
  });
}

export async function getMeterForFacility(estateId: string, meterId: string) {
  const meter = await scoped(estateId).utilityMeter.findById<MeterWithRelations>(meterId, {
    include: meterWithRelations.include,
  });
  if (!meter) throw new NotFoundError("Utility meter");
  return meter;
}

/** Meters on units the resident currently occupies. */
export async function listMetersForResident(estateId: string, residentId: string) {
  const unitIds = (
    await prisma.occupancy.findMany({
      where: { residentId, isCurrent: true },
      select: { unitId: true },
    })
  ).map((o) => o.unitId);

  if (unitIds.length === 0) return [];

  return scoped(estateId).utilityMeter.findMany<MeterWithRelations>({
    where: { unitId: { in: unitIds } } as never,
    orderBy: { createdAt: "desc" },
    include: meterWithRelations.include,
  });
}

/**
 * Records a reading and, if a previous reading exists and the unit has a
 * current billable resident, generates the bill as a real Invoice —
 * reusing Paystack/manual-payment/receipts rather than a parallel payment
 * path. A first-ever reading only establishes a baseline (no bill), and a
 * vacant unit's reading is still recorded but generates nothing to
 * invoice — surfaced to staff via a null `bill`, not silently dropped.
 */
export async function recordReading(estateId: string, actorUserId: string, input: RecordReadingInput) {
  const meter = await scoped(estateId).utilityMeter.findById(input.meterId);
  if (!meter) throw new NotFoundError("Utility meter");

  const lastReading = await prisma.meterReading.findFirst({
    where: { meterId: meter.id },
    orderBy: { createdAt: "desc" },
  });
  const previousReading = lastReading?.currentReading ?? null;

  const reading = await scoped(estateId).meterReading.create({
    meterId: meter.id,
    previousReading,
    currentReading: input.currentReading,
    readingDate: input.readingDate,
    recordedByUserId: actorUserId,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "utility.reading_recorded",
    entityType: "MeterReading",
    entityId: reading.id,
    after: reading,
  });

  if (previousReading === null) {
    return { reading, bill: null }; // baseline only — nothing to compare against yet
  }

  const { consumption, amountKobo } = computeUtilityAmount(previousReading, input.currentReading, meter.rateKobo);

  const residentId = await currentBillableResidentId(prisma, meter.unitId);
  if (!residentId) {
    return { reading, bill: null }; // vacant unit — recorded, nothing to invoice
  }

  const dueDate = new Date(input.readingDate.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000);

  const bill = await prisma.$transaction(async (tx) => {
    const charge = await tx.charge.create({
      data: {
        estateId,
        title: `${meter.utilityType === "ELECTRICITY" ? "Electricity" : "Water"} bill (meter ${meter.meterNumber})`,
        chargeType: meter.utilityType,
        amountKobo,
        dueDate,
        targetType: "SELECTED_PROPERTIES",
        targetCriteria: { unitId: meter.unitId },
      },
    });

    const seq = await nextSequenceNumber(tx, estateId, "invoice");
    const invoice = await tx.invoice.create({
      data: {
        estateId,
        chargeId: charge.id,
        unitId: meter.unitId,
        residentId,
        invoiceNumber: formatSequenceCode("INV", seq),
        amountKobo,
        dueDate,
        status: "PENDING",
      },
    });

    return tx.utilityBill.create({
      data: {
        estateId,
        meterReadingId: reading.id,
        invoiceId: invoice.id,
        consumption,
        rateKobo: meter.rateKobo,
        amountKobo,
      },
      include: { invoice: true },
    });
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "utility.bill_generated",
    entityType: "UtilityBill",
    entityId: bill.id,
    after: { ...bill, invoiceNumber: bill.invoice.invoiceNumber },
  });

  return { reading, bill };
}

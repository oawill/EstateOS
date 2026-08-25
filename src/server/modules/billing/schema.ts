import { ChargeTargetType, ChargeType } from "@prisma/client";
import { z } from "zod";

const targetCriteriaByType = {
  [ChargeTargetType.ENTIRE_ESTATE]: z.object({}).strict(),
  [ChargeTargetType.BLOCK]: z.object({ blockIds: z.array(z.string().cuid()).min(1) }).strict(),
  [ChargeTargetType.STREET]: z.object({ streetIds: z.array(z.string().cuid()).min(1) }).strict(),
  [ChargeTargetType.PROPERTY_TYPE]: z.object({ propertyTypes: z.array(z.string()).min(1) }).strict(),
  [ChargeTargetType.SELECTED_PROPERTIES]: z.object({ propertyIds: z.array(z.string().cuid()).min(1) }).strict(),
};

export const createChargeSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(500).optional(),
    chargeType: z.nativeEnum(ChargeType),
    amountKobo: z.coerce.number().int().positive().max(1_000_000_000),
    dueDate: z.coerce.date(),
    targetType: z.nativeEnum(ChargeTargetType),
    targetCriteria: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, ctx) => {
    const schema = targetCriteriaByType[value.targetType];
    const result = schema.safeParse(value.targetCriteria);
    if (!result.success) {
      ctx.addIssue({ code: "custom", message: `Invalid target criteria for ${value.targetType}`, path: ["targetCriteria"] });
    }
  });
export type CreateChargeInput = z.infer<typeof createChargeSchema>;

export const recordManualPaymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amountKobo: z.coerce.number().int().positive().max(1_000_000_000),
  note: z.string().trim().max(300).optional(),
});
export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;

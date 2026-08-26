import { AnnouncementCategory, AnnouncementTargetType } from "@prisma/client";
import { z } from "zod";

const targetCriteriaByType = {
  [AnnouncementTargetType.ENTIRE_ESTATE]: z.object({}).strict(),
  [AnnouncementTargetType.BLOCK]: z.object({ blockIds: z.array(z.string().cuid()).min(1) }).strict(),
  [AnnouncementTargetType.STREET]: z.object({ streetIds: z.array(z.string().cuid()).min(1) }).strict(),
  [AnnouncementTargetType.ZONE]: z.object({ zoneIds: z.array(z.string().cuid()).min(1) }).strict(),
  [AnnouncementTargetType.SELECTED_PROPERTIES]: z.object({ propertyIds: z.array(z.string().cuid()).min(1) }).strict(),
};

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(1).max(2000),
    category: z.nativeEnum(AnnouncementCategory),
    targetType: z.nativeEnum(AnnouncementTargetType),
    targetCriteria: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, ctx) => {
    const schema = targetCriteriaByType[value.targetType];
    const result = schema.safeParse(value.targetCriteria);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid target criteria for ${value.targetType}`,
        path: ["targetCriteria"],
      });
    }
  });
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

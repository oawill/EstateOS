import { z } from "zod";

export const createEstateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(240).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional(),
});
export type CreateEstateInput = z.infer<typeof createEstateSchema>;

export const namedEntitySchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type NamedEntityInput = z.infer<typeof namedEntitySchema>;

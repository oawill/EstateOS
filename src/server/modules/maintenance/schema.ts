import { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from "@prisma/client";
import { z } from "zod";

export const createTicketSchema = z.object({
  category: z.nativeEnum(MaintenanceCategory),
  description: z.string().trim().min(5, "Please describe the issue in a bit more detail").max(2000),
  location: z.string().trim().max(160).optional(),
  priority: z.nativeEnum(MaintenancePriority),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const transitionTicketSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus),
  note: z.string().trim().max(2000).optional(),
  assignedToUserId: z.string().cuid().optional(),
  vendorId: z.string().cuid().optional(),
});
export type TransitionTicketInput = z.infer<typeof transitionTicketSchema>;

export const residentFeedbackSchema = z.object({
  // z.coerce.boolean() would treat the string "false" as truthy (any
  // non-empty string coerces to true) — parse the literal values instead.
  satisfied: z.enum(["true", "false"]).transform((v) => v === "true"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  feedback: z.string().trim().max(1000).optional(),
});
export type ResidentFeedbackInput = z.infer<typeof residentFeedbackSchema>;

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required").max(160),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  category: z.nativeEnum(MaintenanceCategory).optional(),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

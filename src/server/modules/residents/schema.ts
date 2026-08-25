import { OccupancyRole } from "@prisma/client";
import { z } from "zod";

export const createResidentSchema = z.object({
  unitId: z.string().cuid(),
  occupancyRole: z.nativeEnum(OccupancyRole),
  moveInDate: z.coerce.date(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
});
export type CreateResidentInput = z.infer<typeof createResidentSchema>;

export const createVehicleSchema = z.object({
  plateNumber: z.string().trim().min(2).max(20),
  make: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  color: z.string().trim().max(40).optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

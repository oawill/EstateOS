import { ShortletBookingSource, ShortletPropertyType, ShortletPropertyStatus, AvailabilityBlockReason } from "@prisma/client";
import { z } from "zod";

export const createPropertySchema = z.object({
  name: z.string().trim().min(1, "Property name is required").max(160),
  propertyType: z.nativeEnum(ShortletPropertyType),
  address: z.string().trim().min(1, "Address is required").max(300),
  country: z.string().trim().min(1, "Country is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  maxGuests: z.coerce.number().int().min(1).max(100),
  amenities: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  description: z.string().trim().max(4000).optional(),
  houseRules: z.string().trim().max(4000).optional(),
  checkInTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM"),
  checkOutTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM"),
  baseNightlyRateMinor: z.coerce.number().int().min(0),
  cleaningFeeMinor: z.coerce.number().int().min(0).default(0),
  securityDepositMinor: z.coerce.number().int().min(0).default(0),
  minStayNights: z.coerce.number().int().min(1).default(1),
  maxStayNights: z.coerce.number().int().min(1).optional(),
  unitLabels: z.array(z.string().trim().max(60)).max(200).optional(),
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const updatePropertyStatusSchema = z.object({
  status: z.nativeEnum(ShortletPropertyStatus),
});

export const addUnitSchema = z.object({
  unitLabel: z.string().trim().min(1, "Unit label is required").max(60),
});

export const createGuestSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(160),
  phone: z.string().trim().min(1, "Phone is required").max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  country: z.string().trim().max(100).optional(),
  emergencyContactName: z.string().trim().max(160).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
  vehicleDetails: z.string().trim().max(200).optional(),
  idType: z.string().trim().max(60).optional(),
  idNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
  preferences: z.string().trim().max(2000).optional(),
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const createReservationSchema = z
  .object({
    unitId: z.string().cuid(),
    guestId: z.string().cuid(),
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    numberOfGuests: z.coerce.number().int().min(1).max(100),
    nightlyRateMinor: z.coerce.number().int().min(0),
    taxesMinor: z.coerce.number().int().min(0).default(0),
    cleaningFeeMinor: z.coerce.number().int().min(0).default(0),
    securityDepositMinor: z.coerce.number().int().min(0).default(0),
    discountMinor: z.coerce.number().int().min(0).default(0),
    additionalFeesMinor: z.coerce.number().int().min(0).default(0),
    bookingSource: z.nativeEnum(ShortletBookingSource),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: "Check-out date must be after check-in date",
    path: ["checkOutDate"],
  });
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const createAvailabilityBlockSchema = z
  .object({
    unitId: z.string().cuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.nativeEnum(AvailabilityBlockReason),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });
export type CreateAvailabilityBlockInput = z.infer<typeof createAvailabilityBlockSchema>;

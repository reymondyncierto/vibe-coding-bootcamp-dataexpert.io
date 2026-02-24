import { z } from "zod";

export const publicSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().min(1).max(120),
});

export const publicSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  label: z.string(),
});

export const publicSlotsResponseSchema = z.object({
  clinicSlug: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string(),
  service: z.object({
    id: z.string(),
    name: z.string(),
    durationMinutes: z.number().int().positive(),
  }),
  slots: z.array(publicSlotSchema),
});

export const publicBookingPatientSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(40),
});

export const publicBookingCreateSchema = z.object({
  clinicSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  serviceId: z.string().min(1).max(120),
  slotStartTime: z.string().datetime(),
  patient: publicBookingPatientSchema,
  notes: z.string().trim().max(1000).optional(),
});

export const publicBookingCreateResultSchema = z.object({
  bookingId: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  clinicSlug: z.string(),
  serviceId: z.string(),
  slotStartTime: z.string().datetime(),
  slotEndTime: z.string().datetime(),
  status: z.literal("SCHEDULED"),
  idempotencyKey: z.string(),
});

export type PublicSlotsQuery = z.infer<typeof publicSlotsQuerySchema>;
export type PublicSlot = z.infer<typeof publicSlotSchema>;
export type PublicSlotsResponse = z.infer<typeof publicSlotsResponseSchema>;
export type PublicBookingCreateInput = z.infer<typeof publicBookingCreateSchema>;
export type PublicBookingCreateResult = z.infer<typeof publicBookingCreateResultSchema>;

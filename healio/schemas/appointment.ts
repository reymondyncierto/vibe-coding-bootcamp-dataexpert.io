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

export const appointmentStatusSchema = z.enum([
  "SCHEDULED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);

export const appointmentSourceSchema = z.enum(["ONLINE", "PHONE", "WALK_IN", "STAFF"]);

export const appointmentsListQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().min(1).max(120).optional(),
  status: appointmentStatusSchema.optional(),
});

export const appointmentCreateSchema = z.object({
  clinicId: z.string().min(1),
  patientId: z.string().min(1),
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive(),
  source: appointmentSourceSchema.default("STAFF"),
  notes: z.string().trim().max(2000).optional(),
  isWalkIn: z.boolean().optional(),
  allowDoubleBooking: z.boolean().optional(),
});

export const appointmentUpdateSchema = z
  .object({
    status: appointmentStatusSchema.optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    notes: z.string().trim().max(2000).optional(),
    cancellationReason: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export const appointmentSummarySchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  staffId: z.string(),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: appointmentStatusSchema,
  source: appointmentSourceSchema,
  notes: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
});

export type PublicSlotsQuery = z.infer<typeof publicSlotsQuerySchema>;
export type PublicSlot = z.infer<typeof publicSlotSchema>;
export type PublicSlotsResponse = z.infer<typeof publicSlotsResponseSchema>;
export type PublicBookingCreateInput = z.infer<typeof publicBookingCreateSchema>;
export type PublicBookingCreateResult = z.infer<typeof publicBookingCreateResultSchema>;
export type AppointmentsListQuery = z.infer<typeof appointmentsListQuerySchema>;
export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;
export type AppointmentSummary = z.infer<typeof appointmentSummarySchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

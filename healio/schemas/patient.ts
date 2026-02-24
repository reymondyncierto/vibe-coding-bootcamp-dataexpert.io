import { z } from "zod";

export const patientListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const patientCreateSchema = z.object({
  clinicId: z.string().min(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(255).optional(),
  dateOfBirth: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).optional(),
  allergies: z.string().trim().max(2000).optional(),
  chronicConditions: z.string().trim().max(2000).optional(),
  currentMedications: z.string().trim().max(2000).optional(),
});

export const patientUpdateSchema = patientCreateSchema
  .omit({ clinicId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one patient field is required.",
  });

export const patientSummarySchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  noShowCount: z.number().int().min(0),
  lateCancelCount: z.number().int().min(0),
  lastVisitAt: z.string().datetime().nullable(),
  upcomingAppointmentAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const patientDetailSchema = patientSummarySchema.extend({
  dateOfBirth: z.string().nullable(),
  notes: z.string().nullable(),
  allergies: z.string().nullable(),
  chronicConditions: z.string().nullable(),
  currentMedications: z.string().nullable(),
});

export const patientListResponseSchema = z.object({
  items: z.array(patientSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const visitNoteCreateSchema = z.object({
  appointmentId: z.string().min(1),
  subjective: z.string().trim().min(1).max(10000),
  objective: z.string().trim().max(10000).optional(),
  assessment: z.string().trim().max(10000).optional(),
  plan: z.string().trim().max(10000).optional(),
  amendmentToVisitId: z.string().min(1).optional(),
});

export const visitNoteSummarySchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  appointmentId: z.string(),
  subjective: z.string(),
  objective: z.string().nullable(),
  assessment: z.string().nullable(),
  plan: z.string().nullable(),
  amendmentToVisitId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type PatientListQuery = z.infer<typeof patientListQuerySchema>;
export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
export type PatientSummary = z.infer<typeof patientSummarySchema>;
export type PatientDetail = z.infer<typeof patientDetailSchema>;
export type PatientListResponse = z.infer<typeof patientListResponseSchema>;
export type VisitNoteCreateInput = z.infer<typeof visitNoteCreateSchema>;
export type VisitNoteSummary = z.infer<typeof visitNoteSummarySchema>;

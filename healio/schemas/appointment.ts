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

export type PublicSlotsQuery = z.infer<typeof publicSlotsQuerySchema>;
export type PublicSlot = z.infer<typeof publicSlotSchema>;
export type PublicSlotsResponse = z.infer<typeof publicSlotsResponseSchema>;

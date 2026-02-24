import { z } from "zod";

export const clinicSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
});

export const publicClinicProfileSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string(),
  timezone: z.string(),
  currency: z.enum(["USD", "PHP"]),
});

export const publicServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  price: z.string(),
  color: z.string(),
});

export const publicServiceListSchema = z.array(publicServiceSchema);

export const clinicOperatingHoursItemSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    isClosed: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.isClosed) return;
    if (value.openTime >= value.closeTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "openTime must be earlier than closeTime when not closed.",
        path: ["closeTime"],
      });
    }
  });

export const clinicBookingRulesSchema = z.object({
  leadTimeMinutes: z.number().int().min(0).max(14 * 24 * 60),
  maxAdvanceDays: z.number().int().min(1).max(365),
  slotStepMinutes: z.number().int().min(5).max(120),
  requirePhoneForBooking: z.boolean(),
  allowCancellationFromPublicLink: z.boolean(),
});

export const clinicSettingsResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string().min(1).max(120),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email(),
  timezone: z.string(),
  currency: z.enum(["USD", "PHP"]),
  isPublicBookingEnabled: z.boolean(),
  bookingRules: clinicBookingRulesSchema,
  operatingHours: z.array(clinicOperatingHoursItemSchema).length(7),
  updatedAt: z.string().datetime(),
});

export const clinicSettingsPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().max(255).nullish(),
    phone: z.string().trim().min(5).max(40).nullish(),
    email: z.string().trim().email().max(255).optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
    currency: z.enum(["USD", "PHP"]).optional(),
    isPublicBookingEnabled: z.boolean().optional(),
    bookingRules: clinicBookingRulesSchema.partial().optional(),
    operatingHours: z.array(clinicOperatingHoursItemSchema).length(7).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one clinic settings field is required.",
  });

export type PublicClinicProfile = z.infer<typeof publicClinicProfileSchema>;
export type PublicService = z.infer<typeof publicServiceSchema>;
export type ClinicOperatingHoursItem = z.infer<typeof clinicOperatingHoursItemSchema>;
export type ClinicBookingRules = z.infer<typeof clinicBookingRulesSchema>;
export type ClinicSettingsResponse = z.infer<typeof clinicSettingsResponseSchema>;
export type ClinicSettingsPatch = z.infer<typeof clinicSettingsPatchSchema>;

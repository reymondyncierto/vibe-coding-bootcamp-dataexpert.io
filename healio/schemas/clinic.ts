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

export type PublicClinicProfile = z.infer<typeof publicClinicProfileSchema>;
export type PublicService = z.infer<typeof publicServiceSchema>;

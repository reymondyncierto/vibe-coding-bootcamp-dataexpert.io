import { z } from "zod";

const moneyAmountSchema = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, "Expected a positive money amount with up to 2 decimals.");

export const serviceIdParamSchema = z.object({
  id: z.string().trim().min(3).max(120),
});

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullish(),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  price: moneyAmountSchema,
  color: z.string().trim().min(4).max(20).default("#0EA5A4"),
  isActive: z.boolean().optional(),
});

export const serviceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullish(),
    durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
    price: moneyAmountSchema.optional(),
    color: z.string().trim().min(4).max(20).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const serviceRecordSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  clinicSlug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  price: moneyAmountSchema,
  color: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const servicesListQuerySchema = z.object({
  includeInactive: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
});

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
export type ServiceRecord = z.infer<typeof serviceRecordSchema>;
export type ServicesListQuery = z.infer<typeof servicesListQuerySchema>;

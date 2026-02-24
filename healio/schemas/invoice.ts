import { z } from "zod";

export const invoiceStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "VOID",
  "REFUNDED",
]);

export const paymentMethodSchema = z.enum([
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "GCASH",
  "MAYA",
  "STRIPE",
]);

export const currencySchema = z.enum(["USD", "PHP"]);

export const moneyAmountSchema = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, "Expected a positive money amount with up to 2 decimals.");

export const invoiceLineItemInputSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().int().min(1).max(9999),
  unitPrice: moneyAmountSchema,
});

export const invoiceLineItemSchema = invoiceLineItemInputSchema.extend({
  id: z.string(),
  total: moneyAmountSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const invoiceTotalsInputSchema = z
  .object({
    items: z.array(invoiceLineItemInputSchema).min(1),
    taxAmount: moneyAmountSchema.optional(),
    taxRatePercent: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((value) => !(value.taxAmount && value.taxRatePercent !== undefined), {
    message: "Provide taxAmount or taxRatePercent, not both.",
    path: ["taxAmount"],
  });

export const invoiceCreateSchema = z
  .object({
    clinicId: z.string().trim().min(1),
    patientId: z.string().trim().min(1),
    appointmentId: z.string().trim().min(1).optional(),
    dueDate: z.string().datetime(),
    currency: currencySchema.default("PHP"),
    items: z.array(invoiceLineItemInputSchema).min(1),
    taxAmount: moneyAmountSchema.optional(),
    taxRatePercent: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => !(value.taxAmount && value.taxRatePercent !== undefined), {
    message: "Provide taxAmount or taxRatePercent, not both.",
    path: ["taxAmount"],
  });

export const invoiceUpdateSchema = z
  .object({
    dueDate: z.string().datetime().optional(),
    currency: currencySchema.optional(),
    items: z.array(invoiceLineItemInputSchema).min(1).optional(),
    taxAmount: moneyAmountSchema.optional(),
    taxRatePercent: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(2000).optional(),
    status: invoiceStatusSchema.optional(),
    paidAmount: moneyAmountSchema.optional(),
    paymentMethod: paymentMethodSchema.nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one invoice field is required.",
  })
  .refine((value) => !(value.taxAmount && value.taxRatePercent !== undefined), {
    message: "Provide taxAmount or taxRatePercent, not both.",
    path: ["taxAmount"],
  });

export const invoicesListQuerySchema = z.object({
  patientId: z.string().trim().min(1).optional(),
  status: invoiceStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const invoiceSummarySchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  appointmentId: z.string().nullable(),
  invoiceNumber: z.string(),
  status: invoiceStatusSchema,
  currency: currencySchema,
  subtotal: moneyAmountSchema,
  tax: moneyAmountSchema,
  total: moneyAmountSchema,
  paidAmount: moneyAmountSchema,
  paymentMethod: paymentMethodSchema.nullable(),
  dueDate: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
  sentAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const invoiceDetailSchema = invoiceSummarySchema.extend({
  items: z.array(invoiceLineItemSchema),
  stripePaymentIntentId: z.string().nullable(),
  stripeCheckoutUrl: z.string().nullable(),
  deletedAt: z.string().datetime().nullable(),
});

export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemInputSchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type InvoiceTotalsInput = z.infer<typeof invoiceTotalsInputSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type InvoicesListQuery = z.infer<typeof invoicesListQuerySchema>;
export type InvoiceSummary = z.infer<typeof invoiceSummarySchema>;
export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;

import { z } from "zod";

export const staffRoleSchema = z.enum(["OWNER", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]);
export const staffStatusSchema = z.enum(["ACTIVE", "INVITED", "DISABLED"]);

export const staffRecordSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: staffRoleSchema,
  status: staffStatusSchema,
  specialization: z.string().nullable(),
  isActive: z.boolean(),
  invitedByUserId: z.string().nullable(),
  inviteToken: z.string().nullable(),
  inviteExpiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const staffInviteCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  role: staffRoleSchema,
  specialization: z.string().trim().max(120).nullish(),
});

export type StaffRole = z.infer<typeof staffRoleSchema>;
export type StaffStatus = z.infer<typeof staffStatusSchema>;
export type StaffRecord = z.infer<typeof staffRecordSchema>;
export type StaffInviteCreateInput = z.infer<typeof staffInviteCreateSchema>;

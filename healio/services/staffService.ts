import crypto from "node:crypto";

import { renderWelcomeEmail } from "@/emails/welcome";
import { getClinicSettingsForClinic } from "@/services/clinicService";
import { sendEmailNotificationForClinic } from "@/services/notificationService";
import {
  staffInviteCreateSchema,
  staffRecordSchema,
  type StaffInviteCreateInput,
  type StaffRecord,
} from "@/schemas/staff";

export type StaffServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

function getStore() {
  const globalScope = globalThis as typeof globalThis & { __healioStaffStore?: StaffRecord[] };
  if (!globalScope.__healioStaffStore) {
    globalScope.__healioStaffStore = seedDefaults();
  }
  return globalScope.__healioStaffStore;
}

function nowIso() {
  return new Date().toISOString();
}

function makeStaff(input: Omit<StaffRecord, "id" | "createdAt" | "updatedAt">): StaffRecord {
  const ts = nowIso();
  return staffRecordSchema.parse({
    id: `staff_${crypto.randomUUID()}`,
    createdAt: ts,
    updatedAt: ts,
    ...input,
  });
}

function seedDefaults(): StaffRecord[] {
  return [
    makeStaff({ clinicId: "clinic_1", name: "Dr. Andrea Reyes", email: "owner@northview.example.com", role: "OWNER", status: "ACTIVE", specialization: "General Practitioner", isActive: true, invitedByUserId: null, inviteToken: null, inviteExpiresAt: null }),
    makeStaff({ clinicId: "clinic_1", name: "Dr. Marco Santos", email: "doctor@northview.example.com", role: "DOCTOR", status: "ACTIVE", specialization: "Family Medicine", isActive: true, invitedByUserId: null, inviteToken: null, inviteExpiresAt: null }),
    makeStaff({ clinicId: "clinic_1", name: "Lia Cruz", email: "reception@northview.example.com", role: "RECEPTIONIST", status: "ACTIVE", specialization: null, isActive: true, invitedByUserId: null, inviteToken: null, inviteExpiresAt: null }),
    makeStaff({ clinicId: "clinic_2", name: "Clinic Two Owner", email: "owner@clinic2.example.com", role: "OWNER", status: "ACTIVE", specialization: null, isActive: true, invitedByUserId: null, inviteToken: null, inviteExpiresAt: null }),
  ];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function listStaffForClinic(clinicId: string) {
  return clone(
    getStore()
      .filter((item) => item.clinicId === clinicId)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export async function inviteStaffForClinic(input: {
  clinicId: string;
  invitedByUserId: string;
  payload: StaffInviteCreateInput;
}): Promise<StaffServiceResult<{ staff: StaffRecord; inviteEmail: { replayed: boolean; provider: string; providerMessageId: string | null } }>> {
  const parsed = staffInviteCreateSchema.safeParse(input.payload);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_STAFF_INVITE_PAYLOAD", message: "Invalid staff invite payload.", status: 400, details: parsed.error.flatten() };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = getStore().find((item) => item.clinicId === input.clinicId && item.email === email);
  if (existing) {
    return { ok: false, code: "STAFF_EMAIL_EXISTS", message: "Staff email already exists for this clinic.", status: 409 };
  }

  const inviteToken = `invite_${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
  const staff = makeStaff({
    clinicId: input.clinicId,
    name: parsed.data.name,
    email,
    role: parsed.data.role,
    status: "INVITED",
    specialization: parsed.data.specialization ?? null,
    isActive: true,
    invitedByUserId: input.invitedByUserId,
    inviteToken,
    inviteExpiresAt: expiresAt,
  });
  getStore().push(staff);

  const clinic = await getClinicSettingsForClinic(input.clinicId);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const inviteUrl = `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(inviteToken)}`;
  const emailTemplate = renderWelcomeEmail({
    clinicName: clinic.name,
    ownerName: parsed.data.name,
    bookingPortalUrl: `${baseUrl}/book/${clinic.slug}`,
  });

  const emailDelivery = await sendEmailNotificationForClinic({
    clinicId: input.clinicId,
    type: "STAFF_INVITE",
    recipientEmail: email,
    subject: `You're invited to ${clinic.name} on Healio`,
    html: `${emailTemplate.html}<p style="font-family: Inter, Arial, sans-serif; color: #475569; margin-top: 16px;">Accept your staff invite: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
    text: `${emailTemplate.text}\n\nAccept your staff invite: ${inviteUrl}`,
    idempotencyKey: `staff-invite:${input.clinicId}:${email}`,
    metadata: { clinicId: input.clinicId, inviteToken, role: parsed.data.role },
  });
  if (!emailDelivery.ok) {
    return { ok: false, code: emailDelivery.code, message: emailDelivery.message, status: emailDelivery.status, details: emailDelivery.details };
  }

  return {
    ok: true,
    data: {
      staff: clone(staff),
      inviteEmail: {
        replayed: emailDelivery.data.replayed,
        provider: emailDelivery.data.provider,
        providerMessageId: emailDelivery.data.providerMessageId,
      },
    },
  };
}

export function resetStaffStoreForTests() {
  const store = getStore();
  store.length = 0;
  store.push(...seedDefaults());
}

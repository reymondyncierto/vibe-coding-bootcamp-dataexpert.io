import type { z } from "zod";

import {
  clinicSettingsPatchSchema,
  clinicSettingsResponseSchema,
  type ClinicSettingsResponse,
} from "@/schemas/clinic";
import { getPublicClinicProfileBySlug } from "@/services/clinicPublicService";

export type ClinicServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

type ClinicSettingsStore = Map<string, ClinicSettingsResponse>;

function getClinicSettingsStore(): ClinicSettingsStore {
  const globalScope = globalThis as typeof globalThis & {
    __healioClinicSettingsStore?: ClinicSettingsStore;
  };
  if (!globalScope.__healioClinicSettingsStore) {
    globalScope.__healioClinicSettingsStore = new Map();
  }
  return globalScope.__healioClinicSettingsStore;
}

function createDefaultOperatingHours() {
  return [
    { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 2, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 3, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 4, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 5, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 6, openTime: "09:00", closeTime: "12:00", isClosed: false },
    { dayOfWeek: 0, openTime: "00:00", closeTime: "00:00", isClosed: true },
  ];
}

async function buildDefaultClinicSettings(clinicId: string): Promise<ClinicSettingsResponse> {
  const fallbackProfile = await getPublicClinicProfileBySlug("northview-clinic");
  const nowIso = new Date().toISOString();
  return clinicSettingsResponseSchema.parse({
    id: clinicId,
    slug: fallbackProfile?.slug ?? "northview-clinic",
    name: fallbackProfile?.name ?? "Healio Clinic",
    address: fallbackProfile?.address ?? null,
    phone: fallbackProfile?.phone ?? null,
    email: fallbackProfile?.email ?? "clinic@example.com",
    timezone: fallbackProfile?.timezone ?? "Asia/Manila",
    currency: fallbackProfile?.currency ?? "PHP",
    isPublicBookingEnabled: true,
    bookingRules: {
      leadTimeMinutes: 60,
      maxAdvanceDays: 30,
      slotStepMinutes: 15,
      requirePhoneForBooking: true,
      allowCancellationFromPublicLink: false,
    },
    operatingHours: createDefaultOperatingHours(),
    updatedAt: nowIso,
  });
}

export async function getClinicSettingsForClinic(clinicId: string): Promise<ClinicSettingsResponse> {
  const store = getClinicSettingsStore();
  if (!store.has(clinicId)) {
    store.set(clinicId, await buildDefaultClinicSettings(clinicId));
  }
  return structuredClone(store.get(clinicId)!);
}

export async function provisionClinicSettingsForClinic(input: {
  clinicId: string;
  slug: string;
  name: string;
  email: string;
  timezone: string;
  currency: "PHP" | "USD";
  phone?: string | null;
  address?: string | null;
}): Promise<ClinicSettingsResponse> {
  const store = getClinicSettingsStore();
  const base = await buildDefaultClinicSettings(input.clinicId);
  const next = clinicSettingsResponseSchema.parse({
    ...base,
    slug: input.slug,
    name: input.name,
    email: input.email,
    timezone: input.timezone,
    currency: input.currency,
    phone: input.phone ?? null,
    address: input.address ?? null,
    updatedAt: new Date().toISOString(),
  });
  store.set(input.clinicId, next);
  return structuredClone(next);
}

export async function updateClinicSettingsForClinic(input: {
  clinicId: string;
  patch: z.input<typeof clinicSettingsPatchSchema>;
}): Promise<ClinicServiceResult<ClinicSettingsResponse>> {
  const parsed = clinicSettingsPatchSchema.safeParse(input.patch);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_CLINIC_SETTINGS_PATCH",
      message: "Invalid clinic settings patch payload.",
      status: 400,
      details: parsed.error.flatten(),
    };
  }

  const store = getClinicSettingsStore();
  const current = await getClinicSettingsForClinic(input.clinicId);
  const patch = parsed.data;

  const next = clinicSettingsResponseSchema.parse({
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.address !== undefined ? { address: patch.address ?? null } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone ?? null } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
    ...(patch.isPublicBookingEnabled !== undefined ? { isPublicBookingEnabled: patch.isPublicBookingEnabled } : {}),
    bookingRules: patch.bookingRules ? { ...current.bookingRules, ...patch.bookingRules } : current.bookingRules,
    operatingHours: patch.operatingHours
      ? [...patch.operatingHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      : current.operatingHours,
    updatedAt: new Date().toISOString(),
  });

  store.set(input.clinicId, next);
  return { ok: true, data: structuredClone(next) };
}

export function resetClinicSettingsStoreForTests() {
  getClinicSettingsStore().clear();
}

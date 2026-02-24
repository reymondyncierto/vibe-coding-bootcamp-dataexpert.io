import crypto from "node:crypto";

import { z } from "zod";

import { sanitizeFilenameSegment } from "@/lib/utils";
import { getPublicClinicProfileBySlug } from "@/services/clinicPublicService";
import { provisionClinicSettingsForClinic } from "@/services/clinicService";

const provisionRequestSchema = z.object({
  userId: z.string().trim().min(3).max(200).optional(),
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  clinicName: z.string().trim().min(2).max(120),
  clinicSlug: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().min(1).max(100).default("Asia/Manila"),
  currency: z.enum(["PHP", "USD"]).default("PHP"),
  source: z.enum(["signup", "oauth", "magic_link", "manual"]).default("signup"),
});

type ProvisionRequest = z.input<typeof provisionRequestSchema>;

type ProvisionRecord = {
  userKey: string;
  userId: string;
  email: string;
  fullName: string;
  clinicId: string;
  clinicSlug: string;
  clinicName: string;
  timezone: string;
  currency: "PHP" | "USD";
  createdAt: string;
  updatedAt: string;
};

type ProvisionStore = {
  byUserKey: Map<string, ProvisionRecord>;
  slugs: Set<string>;
};

export type AuthProvisioningResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

export type ProvisioningResponse = {
  replayed: boolean;
  source: "signup" | "oauth" | "magic_link" | "manual";
  authContext: {
    userId: string;
    email: string;
    clinicId: string;
    role: "OWNER";
  };
  clinic: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
    currency: "PHP" | "USD";
  };
  onboarding: {
    nextPath: string;
    recommendedSteps: string[];
  };
};

function getStore(): ProvisionStore {
  const globalScope = globalThis as typeof globalThis & {
    __healioAuthProvisionStore?: ProvisionStore;
  };
  if (!globalScope.__healioAuthProvisionStore) {
    globalScope.__healioAuthProvisionStore = {
      byUserKey: new Map(),
      slugs: new Set(["northview-clinic", "clinic-two"]),
    };
  }
  return globalScope.__healioAuthProvisionStore;
}

function nowIso() {
  return new Date().toISOString();
}

function makeUserKey(userId: string | undefined, email: string) {
  return userId ? `uid:${userId}` : `email:${email.toLowerCase()}`;
}

function fallbackUserId() {
  return `usr_${crypto.randomUUID().replaceAll("-", "")}`;
}

async function slugExists(slug: string) {
  const normalized = slug.toLowerCase();
  if (getStore().slugs.has(normalized)) return true;
  const existingPublic = await getPublicClinicProfileBySlug(normalized);
  return Boolean(existingPublic);
}

async function reserveUniqueSlug(rawSlug: string) {
  const base = sanitizeFilenameSegment(rawSlug) || "healio-clinic";
  let candidate = base;
  let counter = 2;
  while (await slugExists(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  getStore().slugs.add(candidate);
  return candidate;
}

function buildClinicIdFromSlug(slug: string) {
  const base = sanitizeFilenameSegment(slug).slice(0, 40) || "clinic";
  return `clinic_${base}`;
}

function toResponse(record: ProvisionRecord, replayed: boolean, source: ProvisioningResponse["source"]): ProvisioningResponse {
  return {
    replayed,
    source,
    authContext: {
      userId: record.userId,
      email: record.email,
      clinicId: record.clinicId,
      role: "OWNER",
    },
    clinic: {
      id: record.clinicId,
      slug: record.clinicSlug,
      name: record.clinicName,
      timezone: record.timezone,
      currency: record.currency,
    },
    onboarding: {
      nextPath: `/settings?onboarding=1&clinic=${encodeURIComponent(record.clinicSlug)}`,
      recommendedSteps: [
        "Review clinic profile and booking rules",
        "Confirm operating hours",
        "Add services and invite staff",
      ],
    },
  };
}

export async function provisionClinicForUser(
  payload: ProvisionRequest,
): Promise<AuthProvisioningResult<ProvisioningResponse>> {
  const parsed = provisionRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_PROVISION_PAYLOAD",
      message: "Invalid signup provisioning payload.",
      status: 400,
      details: parsed.error.flatten(),
    };
  }

  const input = parsed.data;
  const email = input.email.toLowerCase();
  const userId = input.userId ?? fallbackUserId();
  const userKey = makeUserKey(input.userId, email);
  const store = getStore();

  const existing = store.byUserKey.get(userKey);
  if (existing) {
    const updatedRecord: ProvisionRecord = {
      ...existing,
      email,
      fullName: input.fullName,
      clinicName: input.clinicName,
      timezone: input.timezone,
      currency: input.currency,
      updatedAt: nowIso(),
    };

    await provisionClinicSettingsForClinic({
      clinicId: updatedRecord.clinicId,
      slug: updatedRecord.clinicSlug,
      name: updatedRecord.clinicName,
      email: updatedRecord.email,
      timezone: updatedRecord.timezone,
      currency: updatedRecord.currency,
    });

    store.byUserKey.set(userKey, updatedRecord);
    return { ok: true, data: toResponse(updatedRecord, true, input.source) };
  }

  const clinicSlug = await reserveUniqueSlug(input.clinicSlug ?? input.clinicName);
  const clinicId = buildClinicIdFromSlug(clinicSlug);
  const ts = nowIso();
  const record: ProvisionRecord = {
    userKey,
    userId,
    email,
    fullName: input.fullName,
    clinicId,
    clinicSlug,
    clinicName: input.clinicName,
    timezone: input.timezone,
    currency: input.currency,
    createdAt: ts,
    updatedAt: ts,
  };

  await provisionClinicSettingsForClinic({
    clinicId,
    slug: clinicSlug,
    name: input.clinicName,
    email,
    timezone: input.timezone,
    currency: input.currency,
  });

  store.byUserKey.set(userKey, record);
  return { ok: true, data: toResponse(record, false, input.source) };
}

export function resetAuthProvisioningStoreForTests() {
  const store = getStore();
  store.byUserKey.clear();
  store.slugs = new Set(["northview-clinic", "clinic-two"]);
}


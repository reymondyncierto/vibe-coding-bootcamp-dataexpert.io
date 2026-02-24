import {
  decryptString,
  encryptString,
  isEncryptedValue,
} from "@/lib/encryption";

const SENSITIVE_STRING_FIELDS = [
  "phone",
  "allergies",
  "chronicConditions",
  "currentMedications",
] as const;

type SensitiveStringField = (typeof SENSITIVE_STRING_FIELDS)[number];

export type PatientSensitiveInput = Partial<
  Record<SensitiveStringField, string | null>
> & {
  dateOfBirth?: Date | string | null;
};

function fieldAad(clinicId: string, field: string) {
  return `${clinicId}:${field}`;
}

export function encryptPatientSensitiveFields<T extends PatientSensitiveInput>(
  clinicId: string,
  input: T,
  keyHex?: string,
) {
  const next = { ...input } as Record<string, unknown>;

  for (const field of SENSITIVE_STRING_FIELDS) {
    const value = next[field];
    if (typeof value === "string" && value.length > 0) {
      next[field] = encryptString(value, keyHex, fieldAad(clinicId, field));
    }
  }

  if (next.dateOfBirth instanceof Date) {
    next.dateOfBirth = encryptString(
      next.dateOfBirth.toISOString(),
      keyHex,
      fieldAad(clinicId, "dateOfBirth"),
    );
  } else if (typeof next.dateOfBirth === "string" && next.dateOfBirth.length > 0) {
    next.dateOfBirth = encryptString(
      next.dateOfBirth,
      keyHex,
      fieldAad(clinicId, "dateOfBirth"),
    );
  }

  return next as T;
}

export function decryptPatientSensitiveFields<T extends PatientSensitiveInput>(
  clinicId: string,
  input: T,
  keyHex?: string,
) {
  const next = { ...input } as Record<string, unknown>;

  for (const field of SENSITIVE_STRING_FIELDS) {
    const value = next[field];
    if (isEncryptedValue(value)) {
      next[field] = decryptString(value, keyHex, fieldAad(clinicId, field));
    }
  }

  if (isEncryptedValue(next.dateOfBirth)) {
    next.dateOfBirth = decryptString(
      next.dateOfBirth,
      keyHex,
      fieldAad(clinicId, "dateOfBirth"),
    );
  }

  return next as T & { dateOfBirth?: string | null };
}

export type PublicBookingPatientProfile = {
  id: string;
  clinicSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertPublicBookingPatientInput = {
  clinicSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const publicBookingPatientStore = new Map<string, PublicBookingPatientProfile>();
type PatientAttendanceMetrics = {
  noShowCount: number;
  lateCancelCount: number;
  lastNoShowAt: string | null;
  lastLateCancelAt: string | null;
};

type PatientAttendanceMetricKey = `${string}|${string}`;

function getAttendanceMetricsStore() {
  const globalScope = globalThis as typeof globalThis & {
    __healioPatientAttendanceMetrics?: Map<PatientAttendanceMetricKey, PatientAttendanceMetrics>;
  };
  if (!globalScope.__healioPatientAttendanceMetrics) {
    globalScope.__healioPatientAttendanceMetrics = new Map();
  }
  return globalScope.__healioPatientAttendanceMetrics;
}

function attendanceMetricKey(clinicId: string, patientId: string): PatientAttendanceMetricKey {
  return `${clinicId}|${patientId}`;
}

function getOrCreateAttendanceMetrics(clinicId: string, patientId: string) {
  const store = getAttendanceMetricsStore();
  const key = attendanceMetricKey(clinicId, patientId);
  const existing = store.get(key);
  if (existing) return existing;
  const created: PatientAttendanceMetrics = {
    noShowCount: 0,
    lateCancelCount: 0,
    lastNoShowAt: null,
    lastLateCancelAt: null,
  };
  store.set(key, created);
  return created;
}

function patientStoreKey(clinicSlug: string, email: string) {
  return `${clinicSlug}|${email.trim().toLowerCase()}`;
}

export async function upsertPatientFromPublicBooking(
  input: UpsertPublicBookingPatientInput,
): Promise<PublicBookingPatientProfile> {
  const key = patientStoreKey(input.clinicSlug, input.email);
  const now = new Date().toISOString();
  const existing = publicBookingPatientStore.get(key);
  if (existing) {
    const updated: PublicBookingPatientProfile = {
      ...existing,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      updatedAt: now,
    };
    publicBookingPatientStore.set(key, updated);
    return updated;
  }

  const created: PublicBookingPatientProfile = {
    id: `pat_${crypto.randomUUID()}`,
    clinicSlug: input.clinicSlug,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.trim().toLowerCase(),
    phone: input.phone,
    createdAt: now,
    updatedAt: now,
  };
  publicBookingPatientStore.set(key, created);
  return created;
}

export function recordPatientNoShow(input: {
  clinicId: string;
  patientId: string;
  occurredAt?: string;
}) {
  const metrics = getOrCreateAttendanceMetrics(input.clinicId, input.patientId);
  metrics.noShowCount += 1;
  metrics.lastNoShowAt = input.occurredAt ?? new Date().toISOString();
  return { ...metrics };
}

export function recordPatientLateCancel(input: {
  clinicId: string;
  patientId: string;
  occurredAt?: string;
}) {
  const metrics = getOrCreateAttendanceMetrics(input.clinicId, input.patientId);
  metrics.lateCancelCount += 1;
  metrics.lastLateCancelAt = input.occurredAt ?? new Date().toISOString();
  return { ...metrics };
}

export function getPatientAttendanceMetrics(input: {
  clinicId: string;
  patientId: string;
}): PatientAttendanceMetrics {
  return {
    ...getOrCreateAttendanceMetrics(input.clinicId, input.patientId),
  };
}

export function resetPatientAttendanceMetricsForTests() {
  getAttendanceMetricsStore().clear();
}

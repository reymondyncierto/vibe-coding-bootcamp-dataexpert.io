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

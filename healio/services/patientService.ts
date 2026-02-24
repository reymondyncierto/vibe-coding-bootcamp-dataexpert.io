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

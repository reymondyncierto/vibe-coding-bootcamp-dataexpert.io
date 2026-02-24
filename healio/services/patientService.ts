import {
  decryptString,
  encryptString,
  isEncryptedValue,
} from "@/lib/encryption";
import type {
  PatientCreateInput,
  PatientDetail,
  PatientListQuery,
  PatientListResponse,
  PatientSummary,
  PatientUpdateInput,
  VisitNoteCreateInput,
  VisitNoteSummary,
} from "@/schemas/patient";

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
const DEV_IN_MEMORY_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
type PatientAttendanceMetrics = {
  noShowCount: number;
  lateCancelCount: number;
  lastNoShowAt: string | null;
  lastLateCancelAt: string | null;
};

type PatientAttendanceMetricKey = `${string}|${string}`;
type InternalPatientRecord = {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string; // encrypted
  dateOfBirth: string | null; // encrypted/plain ISO encrypted payload depending input
  notes: string | null;
  allergies: string | null; // encrypted
  chronicConditions: string | null; // encrypted
  currentMedications: string | null; // encrypted
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  searchText: string;
};

type InternalVisitNoteRecord = VisitNoteSummary & {
  deletedAt: string | null;
  createdByUserId?: string | null;
};

function getInternalPatientStore() {
  const globalScope = globalThis as typeof globalThis & {
    __healioInternalPatientStore?: InternalPatientRecord[];
  };
  if (!globalScope.__healioInternalPatientStore) {
    globalScope.__healioInternalPatientStore = [];
  }
  return globalScope.__healioInternalPatientStore;
}

function getInternalVisitNoteStore() {
  const globalScope = globalThis as typeof globalThis & {
    __healioInternalVisitNoteStore?: InternalVisitNoteRecord[];
  };
  if (!globalScope.__healioInternalVisitNoteStore) {
    globalScope.__healioInternalVisitNoteStore = [];
  }
  return globalScope.__healioInternalVisitNoteStore;
}

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

function normalizePatientSearchText(input: {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
}) {
  return [input.firstName, input.lastName, input.email ?? "", input.phone]
    .join(" ")
    .trim()
    .toLowerCase();
}

function decryptNullableSensitiveString(
  clinicId: string,
  field: string,
  value: string | null,
): string | null {
  if (!value) return null;
  if (!isEncryptedValue(value)) return value;
  return decryptString(value, DEV_IN_MEMORY_ENCRYPTION_KEY, `${clinicId}:${field}`);
}

function toPatientSummary(record: InternalPatientRecord): PatientSummary {
  const attendance = getPatientAttendanceMetrics({
    clinicId: record.clinicId,
    patientId: record.id,
  });
  return {
    id: record.id,
    clinicId: record.clinicId,
    firstName: record.firstName,
    lastName: record.lastName,
    fullName: `${record.firstName} ${record.lastName}`.trim(),
    phone: decryptNullableSensitiveString(record.clinicId, "phone", record.phone) ?? "",
    email: record.email,
    noShowCount: attendance.noShowCount,
    lateCancelCount: attendance.lateCancelCount,
    lastVisitAt: null,
    upcomingAppointmentAt: null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPatientDetail(record: InternalPatientRecord): PatientDetail {
  const base = toPatientSummary(record);
  return {
    ...base,
    dateOfBirth: decryptNullableSensitiveString(record.clinicId, "dateOfBirth", record.dateOfBirth),
    notes: record.notes,
    allergies: decryptNullableSensitiveString(record.clinicId, "allergies", record.allergies),
    chronicConditions: decryptNullableSensitiveString(
      record.clinicId,
      "chronicConditions",
      record.chronicConditions,
    ),
    currentMedications: decryptNullableSensitiveString(
      record.clinicId,
      "currentMedications",
      record.currentMedications,
    ),
  };
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

export type PatientServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

export async function createPatientForClinic(
  input: PatientCreateInput,
): Promise<PatientServiceResult<PatientDetail>> {
  const store = getInternalPatientStore();
  const now = new Date().toISOString();
  const email = input.email?.trim().toLowerCase() ?? null;

  const duplicate = store.find(
    (item) =>
      item.deletedAt === null &&
      item.clinicId === input.clinicId &&
      ((email && item.email === email) ||
        normalizePatientSearchText({
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          phone: decryptNullableSensitiveString(item.clinicId, "phone", item.phone) ?? "",
        }) ===
          normalizePatientSearchText({
            firstName: input.firstName,
            lastName: input.lastName,
            email,
            phone: input.phone,
          })),
  );

  if (duplicate) {
    return {
      ok: false,
      code: "PATIENT_ALREADY_EXISTS",
      message: "A matching patient record already exists.",
      status: 409,
    };
  }

  const encrypted = encryptPatientSensitiveFields(
    input.clinicId,
    {
      phone: input.phone,
      allergies: input.allergies ?? null,
      chronicConditions: input.chronicConditions ?? null,
      currentMedications: input.currentMedications ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
    },
    DEV_IN_MEMORY_ENCRYPTION_KEY,
  );

  const record: InternalPatientRecord = {
    id: `pat_${crypto.randomUUID()}`,
    clinicId: input.clinicId,
    firstName: input.firstName,
    lastName: input.lastName,
    email,
    phone: encrypted.phone ?? input.phone,
    dateOfBirth: (encrypted.dateOfBirth as string | null | undefined) ?? null,
    notes: input.notes ?? null,
    allergies: encrypted.allergies ?? null,
    chronicConditions: encrypted.chronicConditions ?? null,
    currentMedications: encrypted.currentMedications ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    searchText: normalizePatientSearchText({
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone,
    }),
  };
  store.push(record);

  return { ok: true, data: toPatientDetail(record) };
}

export async function listPatientsForClinic(input: {
  clinicId: string;
  query: PatientListQuery;
}): Promise<PatientListResponse> {
  const store = getInternalPatientStore();
  const needle = input.query.q?.trim().toLowerCase();

  const filtered = store
    .filter((item) => item.deletedAt === null && item.clinicId === input.clinicId)
    .filter((item) => (needle ? item.searchText.includes(needle) : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / input.query.pageSize);
  const offset = (input.query.page - 1) * input.query.pageSize;
  const items = filtered.slice(offset, offset + input.query.pageSize).map(toPatientSummary);

  return {
    items,
    page: input.query.page,
    pageSize: input.query.pageSize,
    total,
    totalPages,
  };
}

export function getPatientByIdForClinic(clinicId: string, patientId: string): PatientDetail | null {
  const store = getInternalPatientStore();
  const record = store.find(
    (item) => item.deletedAt === null && item.clinicId === clinicId && item.id === patientId,
  );
  return record ? toPatientDetail(record) : null;
}

export async function updatePatientForClinic(input: {
  clinicId: string;
  patientId: string;
  patch: PatientUpdateInput;
}): Promise<PatientServiceResult<PatientDetail>> {
  const store = getInternalPatientStore();
  const record = store.find(
    (item) => item.deletedAt === null && item.clinicId === input.clinicId && item.id === input.patientId,
  );
  if (!record) {
    return { ok: false, code: "PATIENT_NOT_FOUND", message: "Patient not found.", status: 404 };
  }

  if (input.patch.email !== undefined) {
    record.email = input.patch.email ? input.patch.email.trim().toLowerCase() : null;
  }
  if (input.patch.firstName !== undefined) record.firstName = input.patch.firstName;
  if (input.patch.lastName !== undefined) record.lastName = input.patch.lastName;
  if (input.patch.notes !== undefined) record.notes = input.patch.notes ?? null;

  const encrypted = encryptPatientSensitiveFields(
    input.clinicId,
    {
      phone: input.patch.phone ?? undefined,
      allergies: input.patch.allergies ?? undefined,
      chronicConditions: input.patch.chronicConditions ?? undefined,
      currentMedications: input.patch.currentMedications ?? undefined,
      dateOfBirth: input.patch.dateOfBirth ?? undefined,
    },
    DEV_IN_MEMORY_ENCRYPTION_KEY,
  );

  if (input.patch.phone !== undefined && encrypted.phone) record.phone = encrypted.phone;
  if (input.patch.allergies !== undefined) {
    record.allergies = (encrypted.allergies as string | null | undefined) ?? null;
  }
  if (input.patch.chronicConditions !== undefined) {
    record.chronicConditions = (encrypted.chronicConditions as string | null | undefined) ?? null;
  }
  if (input.patch.currentMedications !== undefined) {
    record.currentMedications = (encrypted.currentMedications as string | null | undefined) ?? null;
  }
  if (input.patch.dateOfBirth !== undefined) {
    record.dateOfBirth = (encrypted.dateOfBirth as string | null | undefined) ?? null;
  }

  record.searchText = normalizePatientSearchText({
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    phone: decryptNullableSensitiveString(record.clinicId, "phone", record.phone) ?? "",
  });
  record.updatedAt = new Date().toISOString();

  return { ok: true, data: toPatientDetail(record) };
}

export async function listVisitNotesForPatient(input: {
  clinicId: string;
  patientId: string;
}): Promise<VisitNoteSummary[]> {
  const patient = getPatientByIdForClinic(input.clinicId, input.patientId);
  if (!patient) return [];
  const store = getInternalVisitNoteStore();
  return store
    .filter(
      (item) =>
        item.deletedAt === null &&
        item.clinicId === input.clinicId &&
        item.patientId === input.patientId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ deletedAt: _deletedAt, createdByUserId: _createdByUserId, ...note }) => note);
}

export async function createVisitNoteForPatient(input: {
  clinicId: string;
  patientId: string;
  userId: string;
  payload: VisitNoteCreateInput;
}): Promise<PatientServiceResult<VisitNoteSummary>> {
  const patient = getPatientByIdForClinic(input.clinicId, input.patientId);
  if (!patient) {
    return { ok: false, code: "PATIENT_NOT_FOUND", message: "Patient not found.", status: 404 };
  }

  const store = getInternalVisitNoteStore();
  if (input.payload.amendmentToVisitId) {
    const target = store.find(
      (item) =>
        item.deletedAt === null &&
        item.id === input.payload.amendmentToVisitId &&
        item.clinicId === input.clinicId &&
        item.patientId === input.patientId,
    );
    if (!target) {
      return {
        ok: false,
        code: "VISIT_NOTE_NOT_FOUND",
        message: "Amended visit note was not found for this patient.",
        status: 404,
      };
    }
  }

  const createdAt = new Date().toISOString();
  const record: InternalVisitNoteRecord = {
    id: `visit_${crypto.randomUUID()}`,
    clinicId: input.clinicId,
    patientId: input.patientId,
    appointmentId: input.payload.appointmentId,
    subjective: input.payload.subjective,
    objective: input.payload.objective ?? null,
    assessment: input.payload.assessment ?? null,
    plan: input.payload.plan ?? null,
    amendmentToVisitId: input.payload.amendmentToVisitId ?? null,
    createdAt,
    deletedAt: null,
    createdByUserId: input.userId,
  };
  store.push(record);
  const { deletedAt: _deletedAt, createdByUserId: _createdByUserId, ...note } = record;
  return { ok: true, data: note };
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

export function resetInternalPatientStoreForTests() {
  getInternalPatientStore().length = 0;
  getInternalVisitNoteStore().length = 0;
  resetPatientAttendanceMetricsForTests();
}

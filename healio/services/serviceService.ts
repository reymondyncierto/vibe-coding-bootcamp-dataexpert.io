import crypto from "node:crypto";

import { publicServiceSchema, type PublicService } from "@/schemas/clinic";
import {
  serviceCreateSchema,
  serviceRecordSchema,
  serviceUpdateSchema,
  type ServiceCreateInput,
  type ServiceRecord,
  type ServiceUpdateInput,
} from "@/schemas/service";
import { getPublicClinicProfileBySlug } from "@/services/clinicPublicService";

export type ServiceServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

function getStore() {
  const globalScope = globalThis as typeof globalThis & { __healioServiceStore?: ServiceRecord[] };
  if (!globalScope.__healioServiceStore) {
    globalScope.__healioServiceStore = seedDefaults();
  }
  return globalScope.__healioServiceStore;
}

function nowIso() {
  return new Date().toISOString();
}

function makeRecord(input: {
  clinicId: string;
  clinicSlug: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  color: string;
  isActive?: boolean;
}) {
  const ts = nowIso();
  return serviceRecordSchema.parse({
    id: `svc_${crypto.randomUUID()}`,
    clinicId: input.clinicId,
    clinicSlug: input.clinicSlug,
    name: input.name,
    description: input.description,
    durationMinutes: input.durationMinutes,
    price: input.price,
    color: input.color,
    isActive: input.isActive ?? true,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });
}

function seedDefaults(): ServiceRecord[] {
  return [
    makeRecord({ clinicId: "clinic_1", clinicSlug: "northview-clinic", name: "General Consultation", description: "Primary care consultation for new or returning patients.", durationMinutes: 30, price: "1200.00", color: "#0EA5A4" }),
    makeRecord({ clinicId: "clinic_1", clinicSlug: "northview-clinic", name: "Follow-up Consultation", description: "Short follow-up visit for review and care adjustments.", durationMinutes: 20, price: "800.00", color: "#2563EB" }),
    makeRecord({ clinicId: "clinic_1", clinicSlug: "northview-clinic", name: "Physical Therapy Session", description: "Supervised rehab or mobility treatment session.", durationMinutes: 60, price: "1800.00", color: "#16A34A" }),
    makeRecord({ clinicId: "dev-clinic-northview", clinicSlug: "northview-clinic", name: "General Consultation", description: "Primary care consultation for new or returning patients.", durationMinutes: 30, price: "1200.00", color: "#0EA5A4" }),
    makeRecord({ clinicId: "dev-clinic-northview", clinicSlug: "northview-clinic", name: "Follow-up Consultation", description: "Short follow-up visit for review and care adjustments.", durationMinutes: 20, price: "800.00", color: "#2563EB" }),
    makeRecord({ clinicId: "dev-clinic-northview", clinicSlug: "northview-clinic", name: "Physical Therapy Session", description: "Supervised rehab or mobility treatment session.", durationMinutes: 60, price: "1800.00", color: "#16A34A" }),
    makeRecord({ clinicId: "clinic_2", clinicSlug: "clinic-two", name: "Dermatology Consult", description: "Skin consult.", durationMinutes: 25, price: "1500.00", color: "#F59E0B" }),
  ];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toPublicService(record: ServiceRecord): PublicService {
  return publicServiceSchema.parse({
    id: record.id,
    name: record.name,
    description: record.description,
    durationMinutes: record.durationMinutes,
    price: record.price,
    color: record.color,
  });
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function findRecordIndex(clinicId: string, id: string) {
  return getStore().findIndex((item) => item.clinicId === clinicId && item.id === id && item.deletedAt === null);
}

export async function getPublicServicesByClinicSlug(slug: string): Promise<PublicService[] | null> {
  const clinic = await getPublicClinicProfileBySlug(slug);
  const candidateClinicIds = clinic ? [clinic.id] : [];
  if (slug === "northview-clinic" && !candidateClinicIds.includes("dev-clinic-northview")) {
    candidateClinicIds.push("dev-clinic-northview");
  }

  if (candidateClinicIds.length === 0) return null;

  const services = getStore()
    .filter((item) => item.deletedAt === null && item.isActive)
    .filter((item) => candidateClinicIds.includes(item.clinicId) || item.clinicSlug === slug)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (services.length === 0) return null;
  return services.map(toPublicService);
}

export function listServicesForClinic(input: { clinicId: string; includeInactive?: boolean }) {
  return clone(
    getStore()
      .filter((item) => item.clinicId === input.clinicId && item.deletedAt === null)
      .filter((item) => (input.includeInactive ? true : item.isActive))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
  );
}

export function createServiceForClinic(input: {
  clinicId: string;
  clinicSlug?: string;
  payload: ServiceCreateInput;
}): ServiceServiceResult<ServiceRecord> {
  const parsed = serviceCreateSchema.safeParse(input.payload);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_SERVICE_PAYLOAD", message: "Invalid service payload.", status: 400, details: parsed.error.flatten() };
  }

  const existingConflict = getStore().some(
    (item) =>
      item.clinicId === input.clinicId &&
      item.deletedAt === null &&
      normalizeName(item.name) === normalizeName(parsed.data.name),
  );
  if (existingConflict) {
    return { ok: false, code: "SERVICE_NAME_EXISTS", message: "Service name already exists for this clinic.", status: 409 };
  }

  const record = makeRecord({
    clinicId: input.clinicId,
    clinicSlug: input.clinicSlug ?? (input.clinicId === "clinic_1" ? "northview-clinic" : input.clinicId),
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    durationMinutes: parsed.data.durationMinutes,
    price: parsed.data.price,
    color: parsed.data.color,
    isActive: parsed.data.isActive ?? true,
  });
  getStore().push(record);
  return { ok: true, data: clone(record) };
}

export function updateServiceForClinic(input: {
  clinicId: string;
  serviceId: string;
  patch: ServiceUpdateInput;
}): ServiceServiceResult<ServiceRecord> {
  const parsed = serviceUpdateSchema.safeParse(input.patch);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_SERVICE_PATCH", message: "Invalid service patch payload.", status: 400, details: parsed.error.flatten() };
  }

  const index = findRecordIndex(input.clinicId, input.serviceId);
  if (index === -1) {
    return { ok: false, code: "SERVICE_NOT_FOUND", message: "Service not found.", status: 404 };
  }

  const current = getStore()[index];
  const patch = parsed.data;
  const nextName = patch.name;
  if (nextName) {
    const conflict = getStore().some(
      (item) =>
        item.clinicId === input.clinicId &&
        item.deletedAt === null &&
        item.id !== current.id &&
        normalizeName(item.name) === normalizeName(nextName),
    );
    if (conflict) {
      return { ok: false, code: "SERVICE_NAME_EXISTS", message: "Service name already exists for this clinic.", status: 409 };
    }
  }

  const updated = serviceRecordSchema.parse({
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
    ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    updatedAt: nowIso(),
  });
  getStore()[index] = updated;
  return { ok: true, data: clone(updated) };
}

export function resetServiceStoreForTests() {
  const store = getStore();
  store.length = 0;
  store.push(...seedDefaults());
}

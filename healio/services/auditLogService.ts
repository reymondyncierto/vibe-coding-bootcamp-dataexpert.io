import crypto from "node:crypto";

import { z } from "zod";

import { registerPrismaAuditEmitter, type PrismaAuditEvent } from "@/lib/prisma";

const auditLogCreateSchema = z.object({
  clinicId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorRole: z.string().trim().min(1).nullable().optional(),
  action: z.string().trim().min(2).max(120),
  entityType: z.string().trim().min(1).max(80),
  entityId: z.string().trim().min(1).max(120).nullable().optional(),
  summary: z.string().trim().min(1).max(280),
  metadata: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
});

const auditLogQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  action: z.string().trim().min(1).max(120).optional(),
  entityType: z.string().trim().min(1).max(80).optional(),
  actorUserId: z.string().trim().min(1).max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditLogRecord = {
  id: string;
  clinicId: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
  hash: string;
  previousHash: string | null;
};

export type AuditLogServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

type AuditLogStore = AuditLogRecord[];

function getStore(): AuditLogStore {
  const globalScope = globalThis as typeof globalThis & {
    __healioAuditLogStore?: AuditLogStore;
  };
  if (!globalScope.__healioAuditLogStore) {
    globalScope.__healioAuditLogStore = seedDefaults();
  }
  return globalScope.__healioAuditLogStore;
}

function canonicalHashPayload(input: Omit<AuditLogRecord, "hash">) {
  return JSON.stringify({
    id: input.id,
    clinicId: input.clinicId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata,
    occurredAt: input.occurredAt,
    createdAt: input.createdAt,
    previousHash: input.previousHash,
  });
}

function computeHash(input: Omit<AuditLogRecord, "hash">) {
  return crypto.createHash("sha256").update(canonicalHashPayload(input)).digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function makeRecord(input: z.input<typeof auditLogCreateSchema>, previousHash: string | null): AuditLogRecord {
  const parsed = auditLogCreateSchema.parse(input);
  const nowIso = new Date().toISOString();
  const base: Omit<AuditLogRecord, "hash"> = {
    id: `audit_${crypto.randomUUID()}`,
    clinicId: parsed.clinicId,
    actorUserId: parsed.actorUserId ?? null,
    actorRole: parsed.actorRole ?? null,
    action: parsed.action,
    entityType: parsed.entityType,
    entityId: parsed.entityId ?? null,
    summary: parsed.summary,
    metadata: parsed.metadata ?? {},
    occurredAt: parsed.occurredAt ?? nowIso,
    createdAt: nowIso,
    previousHash,
  };
  return { ...base, hash: computeHash(base) };
}

function seedDefaults(): AuditLogStore {
  const store: AuditLogStore = [];
  for (const seed of [
    {
      clinicId: "clinic_1",
      actorUserId: "user_owner_1",
      actorRole: "OWNER",
      action: "CLINIC_SETTINGS_UPDATED",
      entityType: "clinic",
      entityId: "clinic_1",
      summary: "Clinic profile updated (hours + booking rules).",
      metadata: { source: "settings", fields: ["operatingHours", "bookingRules"] },
      occurredAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    },
    {
      clinicId: "clinic_1",
      actorUserId: "user_owner_1",
      actorRole: "OWNER",
      action: "STAFF_INVITE_SENT",
      entityType: "staff",
      entityId: "staff_demo_invite",
      summary: "Sent staff invite to receptionist@northview.example.com.",
      metadata: { role: "RECEPTIONIST" },
      occurredAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    },
    {
      clinicId: "clinic_1",
      actorUserId: "user_owner_1",
      actorRole: "OWNER",
      action: "INVOICE_MARKED_PAID",
      entityType: "invoice",
      entityId: "inv_demo_1",
      summary: "Invoice INV-2026-00001 marked paid via cash.",
      metadata: { amount: "1200.00", paymentMethod: "CASH" },
      occurredAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    },
  ] as const) {
    const previousHash = store.length ? store[store.length - 1].hash : null;
    store.push(makeRecord(seed, previousHash));
  }
  return store;
}

export function appendAuditLogEntry(
  input: z.input<typeof auditLogCreateSchema>,
): AuditLogServiceResult<AuditLogRecord> {
  const parsed = auditLogCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_AUDIT_LOG_PAYLOAD",
      message: "Invalid audit log payload.",
      status: 400,
      details: parsed.error.flatten(),
    };
  }
  const store = getStore();
  const clinicEntries = store.filter((row) => row.clinicId === parsed.data.clinicId);
  const previousHash = clinicEntries.length ? clinicEntries[clinicEntries.length - 1].hash : null;
  const record = makeRecord(parsed.data, previousHash);
  store.push(record);
  return { ok: true, data: clone(record) };
}

export function listAuditLogsForClinic(input: {
  clinicId: string;
  query?: z.input<typeof auditLogQuerySchema>;
}): AuditLogServiceResult<{ items: AuditLogRecord[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const parsed = auditLogQuerySchema.safeParse(input.query ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_AUDIT_LOG_QUERY",
      message: "Invalid audit log query.",
      status: 400,
      details: parsed.error.flatten(),
    };
  }

  const q = parsed.data.q?.toLowerCase();
  const fromMs = parsed.data.from ? new Date(parsed.data.from).getTime() : null;
  const toMs = parsed.data.to ? new Date(parsed.data.to).getTime() : null;

  const filtered = getStore()
    .filter((row) => row.clinicId === input.clinicId)
    .filter((row) => (parsed.data.action ? row.action === parsed.data.action : true))
    .filter((row) => (parsed.data.entityType ? row.entityType === parsed.data.entityType : true))
    .filter((row) => (parsed.data.actorUserId ? row.actorUserId === parsed.data.actorUserId : true))
    .filter((row) => {
      if (!q) return true;
      return (
        row.summary.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.entityType.toLowerCase().includes(q) ||
        (row.entityId ?? "").toLowerCase().includes(q)
      );
    })
    .filter((row) => {
      const ts = new Date(row.occurredAt).getTime();
      if (fromMs !== null && ts < fromMs) return false;
      if (toMs !== null && ts > toMs) return false;
      return true;
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.createdAt.localeCompare(a.createdAt));

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / parsed.data.pageSize);
  const offset = (parsed.data.page - 1) * parsed.data.pageSize;
  const items = filtered.slice(offset, offset + parsed.data.pageSize);

  return {
    ok: true,
    data: {
      items: clone(items),
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total,
      totalPages,
    },
  };
}

export function verifyAuditLogChainForClinic(clinicId: string): {
  ok: boolean;
  brokenAtId: string | null;
  totalEntries: number;
} {
  const entries = getStore()
    .filter((row) => row.clinicId === clinicId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let previousHash: string | null = null;
  for (const entry of entries) {
    if (entry.previousHash !== previousHash) {
      return { ok: false, brokenAtId: entry.id, totalEntries: entries.length };
    }
    const recalculated = computeHash({
      id: entry.id,
      clinicId: entry.clinicId,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      metadata: entry.metadata,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
      previousHash: entry.previousHash,
    });
    if (recalculated !== entry.hash) {
      return { ok: false, brokenAtId: entry.id, totalEntries: entries.length };
    }
    previousHash = entry.hash;
  }
  return { ok: true, brokenAtId: null, totalEntries: entries.length };
}

export function updateAuditLogEntry(): AuditLogServiceResult<never> {
  return {
    ok: false,
    code: "AUDIT_LOG_IMMUTABLE",
    message: "Audit log entries are immutable and cannot be updated.",
    status: 405,
  };
}

export function deleteAuditLogEntry(): AuditLogServiceResult<never> {
  return {
    ok: false,
    code: "AUDIT_LOG_IMMUTABLE",
    message: "Audit log entries are immutable and cannot be deleted.",
    status: 405,
  };
}

export function recordPrismaAuditEvent(event: PrismaAuditEvent) {
  if (!event.clinicId) return;
  appendAuditLogEntry({
    clinicId: event.clinicId,
    actorUserId: event.userId ?? null,
    actorRole: null,
    action: event.action,
    entityType: event.model,
    entityId: event.recordId ?? null,
    summary: `${event.model} ${event.action}`,
    metadata: event.metadata ?? {},
  });
}

let prismaAuditEmitterRegistered = false;
export function ensureAuditLogPrismaEmitterRegistered() {
  if (prismaAuditEmitterRegistered) return;
  registerPrismaAuditEmitter(recordPrismaAuditEvent);
  prismaAuditEmitterRegistered = true;
}

export function unsafeTamperAuditLogForTests(input: {
  clinicId: string;
  entryId: string;
  patch: Partial<Pick<AuditLogRecord, "summary" | "hash" | "metadata" | "previousHash">>;
}) {
  const entry = getStore().find((row) => row.clinicId === input.clinicId && row.id === input.entryId);
  if (!entry) return false;
  Object.assign(entry, input.patch);
  return true;
}

export function resetAuditLogStoreForTests() {
  const store = getStore();
  store.length = 0;
}


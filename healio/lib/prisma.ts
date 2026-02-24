import { PrismaClient } from "@prisma/client";

import {
  TenantScopingError,
  assertClinicId,
  injectTenantIntoCreateData,
  isTenantScopedModel,
  mergeTenantWhere,
} from "@/lib/tenant-context";

const globalForPrisma = globalThis as typeof globalThis & {
  __healio_prisma__?: PrismaClient;
};

function createPrismaUnavailableStub(cause: unknown) {
  const stub: Record<string, unknown> = {
    $use() {
      return undefined;
    },
    $extends() {
      return stub;
    },
  };
  return new Proxy(stub, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      throw new Error(
        `Prisma client unavailable in this environment. ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    },
  }) as unknown as PrismaClient;
}

function createPrismaClientSafely() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  } catch (error) {
    return createPrismaUnavailableStub(error);
  }
}

export const prisma = globalForPrisma.__healio_prisma__ ?? createPrismaClientSafely();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__healio_prisma__ = prisma;
}

const UNSAFE_UNIQUE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateOrThrow",
  "delete",
  "deleteOrThrow",
  "upsert",
]);

const READ_OPS_WITH_WHERE = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

const MANY_MUTATION_OPS_WITH_WHERE = new Set(["updateMany", "deleteMany"]);

export function createTenantPrisma(clinicId: string) {
  const scopedClinicId = assertClinicId(clinicId);

  return prisma.$extends({
    name: `tenant-scope:${scopedClinicId}`,
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: any) {
          if (!isTenantScopedModel(model)) {
            return query(args);
          }

          if (UNSAFE_UNIQUE_OPS.has(operation)) {
            throw new TenantScopingError(
              `Unsafe ${operation} on tenant-scoped model ${model}. Use a clinic-scoped helper (findFirst/updateMany/deleteMany) instead.`,
            );
          }

          const nextArgs = { ...(args ?? {}) } as Record<string, unknown>;

          if (READ_OPS_WITH_WHERE.has(operation)) {
            nextArgs.where = mergeTenantWhere(
              nextArgs.where as Record<string, unknown> | undefined,
              scopedClinicId,
            );
            return query(nextArgs);
          }

          if (MANY_MUTATION_OPS_WITH_WHERE.has(operation)) {
            nextArgs.where = mergeTenantWhere(
              nextArgs.where as Record<string, unknown> | undefined,
              scopedClinicId,
            );
            return query(nextArgs);
          }

          if (operation === "create") {
            nextArgs.data = injectTenantIntoCreateData(
              nextArgs.data as Record<string, unknown>,
              scopedClinicId,
            );
            return query(nextArgs);
          }

          if (operation === "createMany" || operation === "createManyAndReturn") {
            const payload = nextArgs.data as
              | Record<string, unknown>
              | Record<string, unknown>[];
            nextArgs.data = injectTenantIntoCreateData(payload, scopedClinicId);
            return query(nextArgs);
          }

          // For operations on non-tenant models or unsupported ops, fail closed.
          throw new TenantScopingError(
            `Operation ${operation} on ${model} is not yet supported by the tenant-scoping extension.`,
          );
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

export type PrismaAuditEvent = {
  clinicId?: string | null;
  userId?: string | null;
  action: string;
  model: string;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
};

export type PrismaAuditEmitter = (event: PrismaAuditEvent) => void | Promise<void>;

const globalAuditScope = globalThis as typeof globalThis & {
  __healioPrismaAuditEmitter?: PrismaAuditEmitter;
  __healioPrismaAuditMiddlewareInstalled?: boolean;
};

export function registerPrismaAuditEmitter(emitter: PrismaAuditEmitter) {
  globalAuditScope.__healioPrismaAuditEmitter = emitter;
}

export async function emitPrismaAuditEvent(event: PrismaAuditEvent) {
  const emitter = globalAuditScope.__healioPrismaAuditEmitter;
  if (!emitter) return;
  await emitter(event);
}

const AUDIT_MUTATION_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

export function installPrismaAuditLogging() {
  if (globalAuditScope.__healioPrismaAuditMiddlewareInstalled) return;
  if (typeof (prisma as any).$use !== "function") return;

  (prisma as any).$use(async (params: any, next: (params: any) => Promise<any>) => {
    const result = await next(params);

    if (!AUDIT_MUTATION_OPERATIONS.has(params?.action)) {
      return result;
    }

    const data = (params?.args?.data ?? params?.args?.where ?? null) as Record<string, unknown> | null;
    const clinicId =
      typeof data?.clinicId === "string"
        ? data.clinicId
        : typeof params?.args?.where?.clinicId === "string"
          ? params.args.where.clinicId
          : null;
    const userId =
      typeof data?.updatedByUserId === "string"
        ? data.updatedByUserId
        : typeof data?.createdByUserId === "string"
          ? data.createdByUserId
          : null;

    const recordId =
      typeof result?.id === "string"
        ? result.id
        : typeof params?.args?.where?.id === "string"
          ? params.args.where.id
          : null;

    await emitPrismaAuditEvent({
      clinicId,
      userId,
      action: `${params.model}.${params.action}`,
      model: params.model ?? "unknown",
      recordId,
      metadata: {
        hasWhere: Boolean(params?.args?.where),
        hasData: Boolean(params?.args?.data),
      },
    });

    return result;
  });

  globalAuditScope.__healioPrismaAuditMiddlewareInstalled = true;
}

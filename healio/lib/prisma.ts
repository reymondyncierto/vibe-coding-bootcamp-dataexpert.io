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

export const prisma =
  globalForPrisma.__healio_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

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

import { createTenantPrisma, type TenantPrismaClient } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant-context";
import { assertClinicId, mergeTenantWhere } from "@/lib/tenant-context";

export function getTenantDb(
  clinicOrContext: string | TenantContext,
): TenantPrismaClient {
  const clinicId =
    typeof clinicOrContext === "string"
      ? clinicOrContext
      : clinicOrContext.clinicId;

  return createTenantPrisma(assertClinicId(clinicId));
}

export function tenantWhereById(clinicId: string, id: string) {
  return mergeTenantWhere({ id }, clinicId);
}

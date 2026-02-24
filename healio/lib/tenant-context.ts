const TENANT_SCOPED_MODELS = new Set([
  "Staff",
  "Patient",
  "Service",
  "OperatingHours",
  "Appointment",
  "VisitNote",
  "Document",
  "Invoice",
  "Notification",
  "AuditLog",
] as const);

export class TenantScopingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantScopingError";
  }
}

export interface TenantContext {
  clinicId: string;
  userId?: string;
  role?: string;
}

export function assertClinicId(clinicId: string): string {
  if (!clinicId || typeof clinicId !== "string" || clinicId.trim().length < 3) {
    throw new TenantScopingError("A valid clinicId is required for tenant-scoped access.");
  }
  return clinicId;
}

export function isTenantScopedModel(modelName?: string | null): boolean {
  return Boolean(modelName && TENANT_SCOPED_MODELS.has(modelName as never));
}

export function mergeTenantWhere<T extends Record<string, unknown> | undefined>(
  where: T,
  clinicId: string,
) {
  const normalizedClinicId = assertClinicId(clinicId);
  const nextWhere = { ...(where ?? {}) } as Record<string, unknown>;

  if ("clinicId" in nextWhere && nextWhere.clinicId !== normalizedClinicId) {
    throw new TenantScopingError(
      `Tenant scope mismatch: expected clinicId=${normalizedClinicId}.`,
    );
  }

  nextWhere.clinicId = normalizedClinicId;
  return nextWhere;
}

export function injectTenantIntoCreateData<
  T extends Record<string, unknown> | Record<string, unknown>[],
>(data: T, clinicId: string): T {
  const normalizedClinicId = assertClinicId(clinicId);

  const apply = (row: Record<string, unknown>) => {
    if ("clinicId" in row && row.clinicId !== normalizedClinicId) {
      throw new TenantScopingError(
        `Write rejected: payload clinicId does not match tenant context (${normalizedClinicId}).`,
      );
    }
    return { ...row, clinicId: normalizedClinicId };
  };

  if (Array.isArray(data)) {
    return data.map(apply) as unknown as T;
  }

  return apply(data) as unknown as T;
}

export function tenantScopedModelNames() {
  return Array.from(TENANT_SCOPED_MODELS.values());
}

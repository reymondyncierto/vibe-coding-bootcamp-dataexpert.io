import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { clinicSettingsPatchSchema, clinicSettingsResponseSchema } from "@/schemas/clinic";
import { getClinicSettingsForClinic, updateClinicSettingsForClinic } from "@/services/clinicService";

type RouteAuthContext =
  | { ok: true; clinicId: string; userId: string; role: string }
  | { ok: false; response: Response };

function readRouteAuthContext(request: Request): RouteAuthContext {
  const clinicId = request.headers.get("x-healio-clinic-id")?.trim();
  const userId = request.headers.get("x-healio-user-id")?.trim();
  const role = request.headers.get("x-healio-role")?.trim();

  if (!clinicId || !userId || !role) {
    return {
      ok: false,
      response: errorResponse("UNAUTHENTICATED", "Protected clinics API requires middleware auth context.", 401),
    };
  }

  return { ok: true, clinicId, userId, role };
}

function canUpdateClinic(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function GET(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const settings = await getClinicSettingsForClinic(auth.clinicId);
    const payload = clinicSettingsResponseSchema.parse(settings);

    withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/clinics",
      method: "GET",
    }).info({ role: auth.role }, "clinic_settings_get_ok");

    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

export async function PATCH(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    if (!canUpdateClinic(auth.role)) {
      return errorResponse("FORBIDDEN", "Only OWNER or ADMIN can update clinic settings.", 403);
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return errorResponse("INVALID_BODY", "Invalid clinic settings patch payload.", 400);
    }

    const preflight = clinicSettingsPatchSchema.safeParse(rawBody);
    if (!preflight.success) {
      return errorResponse("INVALID_BODY", "Invalid clinic settings patch payload.", 400, {
        issues: preflight.error.flatten(),
      });
    }

    const updated = await updateClinicSettingsForClinic({
      clinicId: auth.clinicId,
      patch: preflight.data,
    });
    if (!updated.ok) {
      return errorResponse(updated.code, updated.message, updated.status, updated.details);
    }

    const payload = clinicSettingsResponseSchema.parse(updated.data);
    withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/clinics",
      method: "PATCH",
    }).info({ role: auth.role }, "clinic_settings_patch_ok");

    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

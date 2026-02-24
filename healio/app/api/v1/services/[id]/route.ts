import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { serviceIdParamSchema } from "@/schemas/service";
import { updateServiceForClinic } from "@/services/serviceService";

function readAuth(request: Request) {
  const clinicId = request.headers.get("x-healio-clinic-id")?.trim();
  const userId = request.headers.get("x-healio-user-id")?.trim();
  const role = request.headers.get("x-healio-role")?.trim();
  if (!clinicId || !userId || !role) {
    return { ok: false as const, response: errorResponse("UNAUTHENTICATED", "Protected services API requires middleware auth context.", 401) };
  }
  return { ok: true as const, clinicId, userId, role };
}

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readAuth(request);
    if (!auth.ok) return auth.response;
    if (!canManage(auth.role)) {
      return errorResponse("FORBIDDEN", "Only OWNER or ADMIN can manage services.", 403);
    }

    const parsedId = serviceIdParamSchema.safeParse(context.params);
    if (!parsedId.success) {
      return errorResponse("INVALID_SERVICE_ID", "Invalid service id.", 400, { issues: parsedId.error.flatten() });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse("INVALID_BODY", "Invalid service patch payload.", 400);
    }

    const updated = updateServiceForClinic({
      clinicId: auth.clinicId,
      serviceId: parsedId.data.id,
      patch: body as any,
    });
    if (!updated.ok) {
      return errorResponse(updated.code, updated.message, updated.status, updated.details);
    }

    withRequestLogger({ requestId, clinicId: auth.clinicId, userId: auth.userId, path: `/api/v1/services/${parsedId.data.id}`, method: "PATCH" })
      .info({ serviceId: parsedId.data.id }, "services_patch_ok");

    const response = successResponse(updated.data);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

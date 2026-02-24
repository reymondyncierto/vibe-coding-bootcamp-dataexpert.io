import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { servicesListQuerySchema } from "@/schemas/service";
import { createServiceForClinic, listServicesForClinic } from "@/services/serviceService";

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

export async function GET(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readAuth(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parsedQuery = servicesListQuerySchema.safeParse({
      includeInactive: url.searchParams.get("includeInactive") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse("INVALID_QUERY", "Invalid services query.", 400, { issues: parsedQuery.error.flatten() });
    }

    const services = listServicesForClinic({ clinicId: auth.clinicId, includeInactive: parsedQuery.data.includeInactive });
    withRequestLogger({ requestId, clinicId: auth.clinicId, userId: auth.userId, path: "/api/v1/services", method: "GET" })
      .info({ count: services.length }, "services_list_ok");

    const response = successResponse({ items: services });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readAuth(request);
    if (!auth.ok) return auth.response;
    if (!canManage(auth.role)) {
      return errorResponse("FORBIDDEN", "Only OWNER or ADMIN can manage services.", 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse("INVALID_BODY", "Invalid service payload.", 400);
    }

    const created = createServiceForClinic({
      clinicId: auth.clinicId,
      payload: body as any,
    });
    if (!created.ok) {
      return errorResponse(created.code, created.message, created.status, created.details);
    }

    withRequestLogger({ requestId, clinicId: auth.clinicId, userId: auth.userId, path: "/api/v1/services", method: "POST" })
      .info({ serviceId: created.data.id }, "services_create_ok");

    const response = successResponse(created.data, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

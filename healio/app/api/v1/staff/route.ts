import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { inviteStaffForClinic, listStaffForClinic } from "@/services/staffService";

function readAuth(request: Request) {
  const clinicId = request.headers.get("x-healio-clinic-id")?.trim();
  const userId = request.headers.get("x-healio-user-id")?.trim();
  const role = request.headers.get("x-healio-role")?.trim();
  if (!clinicId || !userId || !role) {
    return { ok: false as const, response: errorResponse("UNAUTHENTICATED", "Protected staff API requires middleware auth context.", 401) };
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

    const items = listStaffForClinic(auth.clinicId);
    withRequestLogger({ requestId, clinicId: auth.clinicId, userId: auth.userId, path: "/api/v1/staff", method: "GET" })
      .info({ count: items.length }, "staff_list_ok");

    const response = successResponse({ items });
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
      return errorResponse("FORBIDDEN", "Only OWNER or ADMIN can invite staff.", 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse("INVALID_BODY", "Invalid staff invite payload.", 400);
    }

    const invited = await inviteStaffForClinic({
      clinicId: auth.clinicId,
      invitedByUserId: auth.userId,
      payload: body as any,
    });
    if (!invited.ok) {
      return errorResponse(invited.code, invited.message, invited.status, invited.details);
    }

    withRequestLogger({ requestId, clinicId: auth.clinicId, userId: auth.userId, path: "/api/v1/staff", method: "POST" })
      .info({ staffId: invited.data.staff.id, role: invited.data.staff.role }, "staff_invite_ok");

    const response = successResponse(invited.data, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

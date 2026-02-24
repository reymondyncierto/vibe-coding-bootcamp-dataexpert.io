import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  ensureAuditLogPrismaEmitterRegistered,
  listAuditLogsForClinic,
  verifyAuditLogChainForClinic,
} from "@/services/auditLogService";

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
      response: errorResponse("UNAUTHENTICATED", "Protected audit log API requires middleware auth context.", 401),
    };
  }
  return { ok: true, clinicId, userId, role };
}

function canReadAuditLogs(role: string) {
  return role === "OWNER";
}

export async function GET(request: Request) {
  return withRouteErrorHandling(async () => {
    ensureAuditLogPrismaEmitterRegistered();

    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;
    if (!canReadAuditLogs(auth.role)) {
      return errorResponse("FORBIDDEN", "Only OWNER can view audit logs.", 403);
    }

    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize");
    const listResult = listAuditLogsForClinic({
      clinicId: auth.clinicId,
      query: {
        q: url.searchParams.get("q") ?? undefined,
        action: url.searchParams.get("action") ?? undefined,
        entityType: url.searchParams.get("entityType") ?? undefined,
        actorUserId: url.searchParams.get("actorUserId") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        page: pageParam === null ? undefined : Number(pageParam),
        pageSize: pageSizeParam === null ? undefined : Number(pageSizeParam),
      },
    });
    if (!listResult.ok) {
      return errorResponse(listResult.code, listResult.message, listResult.status, listResult.details);
    }

    const chain = verifyAuditLogChainForClinic(auth.clinicId);
    const payload = {
      ...listResult.data,
      chainIntegrity: chain,
    };

    withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/audit-logs",
      method: "GET",
    }).info(
      {
        page: listResult.data.page,
        pageSize: listResult.data.pageSize,
        total: listResult.data.total,
        chainOk: chain.ok,
      },
      "audit_logs_get_ok",
    );

    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

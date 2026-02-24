import { z } from "zod";

import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { getAnalyticsDashboardForClinic } from "@/services/analyticsService";

type RouteAuthContext =
  | { ok: true; clinicId: string; userId: string; role: string }
  | { ok: false; response: Response };

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
});

function readRouteAuthContext(request: Request): RouteAuthContext {
  const clinicId = request.headers.get("x-healio-clinic-id")?.trim();
  const userId = request.headers.get("x-healio-user-id")?.trim();
  const role = request.headers.get("x-healio-role")?.trim();
  if (!clinicId || !userId || !role) {
    return {
      ok: false,
      response: errorResponse("UNAUTHENTICATED", "Protected analytics API requires middleware auth context.", 401),
    };
  }
  return { ok: true, clinicId, userId, role };
}

export async function GET(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parsedQuery = analyticsQuerySchema.safeParse({
      days: url.searchParams.get("days") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse("INVALID_ANALYTICS_QUERY", "Invalid analytics query.", 400, {
        issues: parsedQuery.error.flatten(),
      });
    }

    const result = await getAnalyticsDashboardForClinic({
      clinicId: auth.clinicId,
      days: parsedQuery.data.days,
    });
    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, result.details);
    }

    withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/analytics",
      method: "GET",
    }).info({ role: auth.role, days: parsedQuery.data.days, cacheHit: result.data.cache.hit }, "analytics_get_ok");

    const response = successResponse(result.data);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}


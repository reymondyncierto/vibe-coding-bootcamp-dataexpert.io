import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { getRequestId } from "@/lib/utils";
import { withRequestLogger } from "@/lib/logger";
import {
  createSubscriptionCheckoutForClinic,
  getClinicSubscription,
  listSubscriptionPlanCatalog,
  subscriptionCheckoutRequestSchema,
} from "@/services/subscriptionService";

function readAuth(request: Request) {
  const clinicId = request.headers.get("x-healio-clinic-id")?.trim();
  const userId = request.headers.get("x-healio-user-id")?.trim();
  const role = request.headers.get("x-healio-role")?.trim();
  if (!clinicId || !userId || !role) {
    return { ok: false as const, response: errorResponse("UNAUTHENTICATED", "Protected subscription API requires middleware auth context.", 401) };
  }
  return { ok: true as const, clinicId, userId, role };
}

function canUpgrade(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function GET(request: Request) {
  return withRouteErrorHandling(async () => {
    const auth = readAuth(request);
    if (!auth.ok) return auth.response;
    const response = successResponse({
      subscription: getClinicSubscription(auth.clinicId),
      plans: listSubscriptionPlanCatalog(),
    });
    response.headers.set("x-request-id", getRequestId(request.headers));
    return response;
  });
}

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readAuth(request);
    if (!auth.ok) return auth.response;
    if (!canUpgrade(auth.role)) {
      return errorResponse("FORBIDDEN", "Only OWNER or ADMIN can start subscription checkout.", 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse("INVALID_BODY", "Invalid subscription checkout payload.", 400);
    }
    const parsed = subscriptionCheckoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid subscription checkout payload.", 400, { issues: parsed.error.flatten() });
    }

    const url = new URL(request.url);
    const result = await createSubscriptionCheckoutForClinic({
      clinicId: auth.clinicId,
      targetPlan: parsed.data.plan,
      requestOrigin: url.origin,
    });
    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status);
    }

    withRequestLogger({ requestId, clinicId: auth.clinicId, userId: auth.userId, path: "/api/v1/subscription/checkout", method: "POST" })
      .info({ plan: parsed.data.plan, provider: result.data.provider }, "subscription_checkout_created");

    const response = successResponse(result.data);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

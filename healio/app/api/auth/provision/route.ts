import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { provisionClinicForUser } from "@/services/authProvisioningService";

async function getOptionalSessionIdentity() {
  try {
    const mod = await import("@/lib/supabase/server");
    const supabase = mod.createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { userId: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return errorResponse("INVALID_BODY", "Invalid auth provisioning payload.", 400);
    }

    const sessionIdentity = await getOptionalSessionIdentity();
    const body = rawBody as Record<string, unknown>;
    const result = await provisionClinicForUser({
      userId: typeof body.userId === "string" ? body.userId : sessionIdentity?.userId,
      email: typeof body.email === "string" ? body.email : (sessionIdentity?.email ?? ""),
      fullName: typeof body.fullName === "string" ? body.fullName : "",
      clinicName: typeof body.clinicName === "string" ? body.clinicName : "",
      clinicSlug: typeof body.clinicSlug === "string" ? body.clinicSlug : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      currency: body.currency === "PHP" || body.currency === "USD" ? body.currency : undefined,
      source:
        body.source === "signup" ||
        body.source === "oauth" ||
        body.source === "magic_link" ||
        body.source === "manual"
          ? body.source
          : undefined,
    });

    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, result.details);
    }

    const response = successResponse(result.data, { status: result.data.replayed ? 200 : 201 });
    response.headers.set("x-request-id", requestId);
    withRequestLogger({
      requestId,
      clinicId: result.data.authContext.clinicId,
      userId: result.data.authContext.userId,
      path: "/api/auth/provision",
      method: "POST",
    }).info({ source: result.data.source, replayed: result.data.replayed }, "auth_provision_ok");
    return response;
  });
}

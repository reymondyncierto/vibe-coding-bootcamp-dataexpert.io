import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  patientCreateSchema,
  patientDetailSchema,
  patientListQuerySchema,
  patientListResponseSchema,
} from "@/schemas/patient";
import { createPatientForClinic, listPatientsForClinic } from "@/services/patientService";

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
      response: errorResponse(
        "UNAUTHENTICATED",
        "Protected patient API requires middleware auth context.",
        401,
      ),
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
    const parsed = patientListQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return errorResponse("INVALID_QUERY", "Invalid patients query.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/patients",
      method: "GET",
    });

    const result = await listPatientsForClinic({
      clinicId: auth.clinicId,
      query: parsed.data,
    });
    const payload = patientListResponseSchema.parse(result);
    log.info(
      { count: payload.items.length, page: payload.page, total: payload.total, q: parsed.data.q ?? null },
      "patients_list_ok",
    );
    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return errorResponse("INVALID_BODY", "Invalid patient payload.", 400);
    }
    const body = rawBody as Record<string, unknown>;
    if (body.clinicId && body.clinicId !== auth.clinicId) {
      return errorResponse(
        "CLINIC_SCOPE_MISMATCH",
        "Payload clinicId does not match authenticated clinic.",
        403,
      );
    }

    const parsed = patientCreateSchema.safeParse({
      ...body,
      clinicId: auth.clinicId,
    });
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid patient payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/patients",
      method: "POST",
    });

    const created = await createPatientForClinic(parsed.data);
    if (!created.ok) {
      return errorResponse(created.code, created.message, created.status, created.details);
    }

    const payload = patientDetailSchema.parse(created.data);
    log.info({ patientId: payload.id }, "patients_create_ok");
    const response = successResponse(payload, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

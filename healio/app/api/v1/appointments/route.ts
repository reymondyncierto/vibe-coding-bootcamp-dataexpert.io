import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  appointmentCreateSchema,
  appointmentSummarySchema,
  appointmentsListQuerySchema,
} from "@/schemas/appointment";
import {
  createAppointmentForClinic,
  listAppointmentsForClinicDay,
} from "@/services/appointmentService";

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
        "Protected appointment API requires middleware auth context.",
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
    const query = appointmentsListQuerySchema.safeParse({
      date: url.searchParams.get("date"),
      staffId: url.searchParams.get("staffId") || undefined,
      status: url.searchParams.get("status") || undefined,
    });

    if (!query.success) {
      return errorResponse("INVALID_QUERY", "Invalid appointments query.", 400, {
        issues: query.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/appointments",
      method: "GET",
    });

    const items = await listAppointmentsForClinicDay({
      clinicId: auth.clinicId,
      query: query.data,
    });
    const payload = items.map((item) => appointmentSummarySchema.parse(item));

    log.info({ count: payload.length, date: query.data.date }, "appointments_list_ok");
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
      return errorResponse("INVALID_BODY", "Invalid appointment payload.", 400);
    }

    const body = rawBody as Record<string, unknown>;
    if (body.clinicId && body.clinicId !== auth.clinicId) {
      return errorResponse(
        "CLINIC_SCOPE_MISMATCH",
        "Payload clinicId does not match authenticated clinic.",
        403,
      );
    }

    const parsed = appointmentCreateSchema.safeParse({
      ...body,
      clinicId: auth.clinicId,
    });
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid appointment payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/appointments",
      method: "POST",
    });

    const created = await createAppointmentForClinic(parsed.data);
    if (!created.ok) {
      return errorResponse(created.code, created.message, created.status, created.details);
    }

    const payload = appointmentSummarySchema.parse(created.data);
    log.info({ appointmentId: payload.id, staffId: payload.staffId }, "appointments_create_ok");
    const response = successResponse(payload, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  appointmentSummarySchema,
  appointmentUpdateSchema,
} from "@/schemas/appointment";
import {
  deleteAppointmentForClinic,
  getAppointmentByIdForClinic,
  updateAppointmentForClinic,
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

function validateId(id: string) {
  return typeof id === "string" && id.trim().length >= 4;
}

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const id = context.params.id;
    if (!validateId(id)) {
      return errorResponse("INVALID_APPOINTMENT_ID", "Invalid appointment id.", 400);
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/appointments/${id}`,
      method: "GET",
    });

    const appointment = getAppointmentByIdForClinic(auth.clinicId, id);
    if (!appointment) {
      return errorResponse("APPOINTMENT_NOT_FOUND", "Appointment not found.", 404);
    }

    const payload = appointmentSummarySchema.parse(appointment);
    log.info({ appointmentId: id }, "appointment_detail_ok");
    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const id = context.params.id;
    if (!validateId(id)) {
      return errorResponse("INVALID_APPOINTMENT_ID", "Invalid appointment id.", 400);
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = appointmentUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid appointment update payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/appointments/${id}`,
      method: "PATCH",
    });

    const result = await updateAppointmentForClinic({
      clinicId: auth.clinicId,
      appointmentId: id,
      patch: parsed.data,
    });
    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, result.details);
    }

    const payload = appointmentSummarySchema.parse(result.data);
    log.info({ appointmentId: id, status: payload.status }, "appointment_update_ok");
    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } },
) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const id = context.params.id;
    if (!validateId(id)) {
      return errorResponse("INVALID_APPOINTMENT_ID", "Invalid appointment id.", 400);
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/appointments/${id}`,
      method: "DELETE",
    });

    const result = await deleteAppointmentForClinic({
      clinicId: auth.clinicId,
      appointmentId: id,
    });
    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, result.details);
    }

    log.info({ appointmentId: id }, "appointment_delete_ok");
    const response = successResponse(result.data);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

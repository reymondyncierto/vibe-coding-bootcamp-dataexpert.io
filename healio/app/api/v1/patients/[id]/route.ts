import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { patientDetailSchema, patientUpdateSchema } from "@/schemas/patient";
import { getPatientByIdForClinic, updatePatientForClinic } from "@/services/patientService";

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

function validatePatientId(id: string) {
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
    if (!validatePatientId(id)) {
      return errorResponse("INVALID_PATIENT_ID", "Invalid patient id.", 400);
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/patients/${id}`,
      method: "GET",
    });

    const patient = getPatientByIdForClinic(auth.clinicId, id);
    if (!patient) {
      return errorResponse("PATIENT_NOT_FOUND", "Patient not found.", 404);
    }

    const payload = patientDetailSchema.parse(patient);
    log.info({ patientId: id }, "patients_detail_ok");
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
    if (!validatePatientId(id)) {
      return errorResponse("INVALID_PATIENT_ID", "Invalid patient id.", 400);
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = patientUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid patient update payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/patients/${id}`,
      method: "PATCH",
    });

    const updated = await updatePatientForClinic({
      clinicId: auth.clinicId,
      patientId: id,
      patch: parsed.data,
    });
    if (!updated.ok) {
      return errorResponse(updated.code, updated.message, updated.status, updated.details);
    }

    const payload = patientDetailSchema.parse(updated.data);
    log.info({ patientId: id }, "patients_update_ok");
    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

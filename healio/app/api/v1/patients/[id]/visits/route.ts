import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { visitNoteCreateSchema, visitNoteSummarySchema } from "@/schemas/patient";
import {
  createVisitNoteForPatient,
  getPatientByIdForClinic,
  listVisitNotesForPatient,
} from "@/services/patientService";

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
        "Protected patient visit API requires middleware auth context.",
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

    const patientId = context.params.id;
    if (!validatePatientId(patientId)) {
      return errorResponse("INVALID_PATIENT_ID", "Invalid patient id.", 400);
    }

    if (!getPatientByIdForClinic(auth.clinicId, patientId)) {
      return errorResponse("PATIENT_NOT_FOUND", "Patient not found.", 404);
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/patients/${patientId}/visits`,
      method: "GET",
    });

    const notes = await listVisitNotesForPatient({
      clinicId: auth.clinicId,
      patientId,
    });
    const payload = notes.map((item) => visitNoteSummarySchema.parse(item));
    log.info({ patientId, count: payload.length }, "patient_visits_list_ok");
    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

export async function POST(
  request: Request,
  context: { params: { id: string } },
) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const patientId = context.params.id;
    if (!validatePatientId(patientId)) {
      return errorResponse("INVALID_PATIENT_ID", "Invalid patient id.", 400);
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = visitNoteCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid visit note payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/patients/${patientId}/visits`,
      method: "POST",
    });

    const created = await createVisitNoteForPatient({
      clinicId: auth.clinicId,
      patientId,
      userId: auth.userId,
      payload: parsed.data,
    });
    if (!created.ok) {
      return errorResponse(created.code, created.message, created.status, created.details);
    }

    const payload = visitNoteSummarySchema.parse(created.data);
    log.info({ patientId, visitId: payload.id, amendmentToVisitId: payload.amendmentToVisitId }, "patient_visit_create_ok");
    const response = successResponse(payload, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

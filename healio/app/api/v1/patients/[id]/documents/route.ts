import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  listPatientDocumentsWithSignedUrlsForClinic,
  uploadPatientDocumentForClinic,
} from "@/services/documentService";
import { getPatientByIdForClinic } from "@/services/patientService";

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
        "Protected patient documents API requires middleware auth context.",
        401,
      ),
    };
  }

  return { ok: true, clinicId, userId, role };
}

function validatePatientId(id: string) {
  return typeof id === "string" && id.trim().length >= 4;
}

function normalizeUploadedFile(formValue: FormDataEntryValue | null) {
  if (!formValue) return null;
  if (typeof formValue === "string") return null;
  if (typeof File !== "undefined" && formValue instanceof File) return formValue;
  return null;
}

async function ensurePatientExists(clinicId: string, patientId: string) {
  return Boolean(getPatientByIdForClinic(clinicId, patientId));
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
    if (!(await ensurePatientExists(auth.clinicId, patientId))) {
      return errorResponse("PATIENT_NOT_FOUND", "Patient not found.", 404);
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/patients/${patientId}/documents`,
      method: "GET",
    });

    const listed = await listPatientDocumentsWithSignedUrlsForClinic({
      clinicId: auth.clinicId,
      patientId,
      expiresInSeconds: 900,
    });
    if (!listed.ok) {
      return errorResponse(listed.code, listed.message, listed.status, listed.details);
    }

    log.info({ patientId, count: listed.data.length }, "patient_documents_list_ok");
    const response = successResponse(listed.data);
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
    if (!(await ensurePatientExists(auth.clinicId, patientId))) {
      return errorResponse("PATIENT_NOT_FOUND", "Patient not found.", 404);
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return errorResponse("INVALID_MULTIPART_BODY", "Invalid multipart form upload.", 400);
    }

    const uploadedFile = normalizeUploadedFile(formData.get("file"));
    if (!uploadedFile) {
      return errorResponse("FILE_REQUIRED", "A document file is required in the 'file' field.", 400);
    }

    const bytes = new Uint8Array(await uploadedFile.arrayBuffer());
    const created = await uploadPatientDocumentForClinic({
      clinicId: auth.clinicId,
      patientId,
      staffId: auth.userId,
      filename: uploadedFile.name || "document",
      mimeType: uploadedFile.type || "application/octet-stream",
      bytes,
    });
    if (!created.ok) {
      return errorResponse(created.code, created.message, created.status, created.details);
    }

    const listed = await listPatientDocumentsWithSignedUrlsForClinic({
      clinicId: auth.clinicId,
      patientId,
      expiresInSeconds: 900,
    });
    if (!listed.ok) {
      return errorResponse(listed.code, listed.message, listed.status, listed.details);
    }

    const createdWithUrl = listed.data.find((item) => item.id === created.data.id);
    if (!createdWithUrl) {
      return errorResponse(
        "DOCUMENT_UPLOAD_PERSISTENCE_ERROR",
        "Document uploaded but could not be reloaded.",
        500,
      );
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/patients/${patientId}/documents`,
      method: "POST",
    });
    log.info(
      {
        patientId,
        documentId: createdWithUrl.id,
        mimeType: createdWithUrl.mimeType,
        sizeBytes: createdWithUrl.sizeBytes,
      },
      "patient_documents_upload_ok",
    );

    const response = successResponse(createdWithUrl, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { invoiceDetailSchema, invoiceUpdateSchema } from "@/schemas/invoice";
import { getInvoiceByIdForClinic, updateInvoiceForClinic } from "@/services/invoiceService";

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
        "Protected invoice API requires middleware auth context.",
        401,
      ),
    };
  }

  return { ok: true, clinicId, userId, role };
}

function validateInvoiceId(id: string) {
  return typeof id === "string" && id.trim().length >= 4;
}

export async function GET(request: Request, context: { params: { id: string } }) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const invoiceId = context.params.id;
    if (!validateInvoiceId(invoiceId)) {
      return errorResponse("INVALID_INVOICE_ID", "Invalid invoice id.", 400);
    }

    const invoice = getInvoiceByIdForClinic(auth.clinicId, invoiceId);
    if (!invoice) {
      return errorResponse("INVOICE_NOT_FOUND", "Invoice not found.", 404);
    }

    const payload = invoiceDetailSchema.parse(invoice);
    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/invoices/${invoiceId}`,
      method: "GET",
    });
    log.info({ invoiceId }, "invoice_detail_ok");

    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const invoiceId = context.params.id;
    if (!validateInvoiceId(invoiceId)) {
      return errorResponse("INVALID_INVOICE_ID", "Invalid invoice id.", 400);
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return errorResponse("INVALID_BODY", "Invalid invoice patch payload.", 400);
    }

    const parsed = invoiceUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid invoice patch payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const updated = updateInvoiceForClinic({
      clinicId: auth.clinicId,
      invoiceId,
      patch: parsed.data,
    });
    if (!updated.ok) {
      return errorResponse(updated.code, updated.message, updated.status, updated.details);
    }

    const payload = invoiceDetailSchema.parse(updated.data);
    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/invoices/${invoiceId}`,
      method: "PATCH",
    });
    log.info({ invoiceId, status: payload.status }, "invoice_patch_ok");

    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

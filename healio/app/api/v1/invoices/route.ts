import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  invoiceCreateSchema,
  invoiceDetailSchema,
  invoiceListResponseSchema,
  invoicesListQuerySchema,
} from "@/schemas/invoice";
import { createInvoiceForClinic, listInvoicesForClinic } from "@/services/invoiceService";

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

export async function GET(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const auth = readRouteAuthContext(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parsed = invoicesListQuerySchema.safeParse({
      patientId: url.searchParams.get("patientId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return errorResponse("INVALID_QUERY", "Invalid invoices query.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const result = listInvoicesForClinic({ clinicId: auth.clinicId, query: parsed.data });
    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, result.details);
    }

    const payload = invoiceListResponseSchema.parse(result.data);
    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/invoices",
      method: "GET",
    });
    log.info(
      {
        count: payload.items.length,
        total: payload.total,
        page: payload.page,
        patientId: parsed.data.patientId ?? null,
        status: parsed.data.status ?? null,
      },
      "invoices_list_ok",
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
      return errorResponse("INVALID_BODY", "Invalid invoice payload.", 400);
    }
    const body = rawBody as Record<string, unknown>;

    if (body.clinicId && body.clinicId !== auth.clinicId) {
      return errorResponse(
        "CLINIC_SCOPE_MISMATCH",
        "Payload clinicId does not match authenticated clinic.",
        403,
      );
    }

    const parsed = invoiceCreateSchema.safeParse({
      ...body,
      clinicId: auth.clinicId,
    });
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid invoice payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const created = createInvoiceForClinic(parsed.data);
    if (!created.ok) {
      return errorResponse(created.code, created.message, created.status, created.details);
    }

    const payload = invoiceDetailSchema.parse(created.data);
    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: "/api/v1/invoices",
      method: "POST",
    });
    log.info({ invoiceId: payload.id, invoiceNumber: payload.invoiceNumber }, "invoices_create_ok");

    const response = successResponse(payload, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

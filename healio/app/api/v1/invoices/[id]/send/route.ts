import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { renderInvoiceEmailTemplate } from "@/emails/invoice";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { getInvoiceByIdForClinic } from "@/services/invoiceService";
import { sendInvoiceEmailNotificationForClinic } from "@/services/notificationService";
import { getPatientByIdForClinic } from "@/services/patientService";
import { createInvoiceStripePayLinkForClinic } from "@/services/stripeService";

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

export async function POST(request: Request, context: { params: { id: string } }) {
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

    const patient = getPatientByIdForClinic(auth.clinicId, invoice.patientId);
    if (!patient) {
      return errorResponse("PATIENT_NOT_FOUND", "Patient not found for invoice.", 404);
    }
    if (!patient.email) {
      return errorResponse("PATIENT_EMAIL_REQUIRED", "Patient email is required to send invoice email.", 409);
    }

    const payLinkResult = await createInvoiceStripePayLinkForClinic({
      clinicId: auth.clinicId,
      invoiceId,
      requestOrigin: new URL(request.url).origin,
    });
    if (!payLinkResult.ok && payLinkResult.code !== "INVOICE_ALREADY_PAID") {
      return errorResponse(payLinkResult.code, payLinkResult.message, payLinkResult.status, payLinkResult.details);
    }

    const refreshedInvoice = getInvoiceByIdForClinic(auth.clinicId, invoiceId);
    if (!refreshedInvoice) {
      return errorResponse("INVOICE_NOT_FOUND", "Invoice not found after pay-link generation.", 404);
    }
    const checkoutUrl = refreshedInvoice.stripeCheckoutUrl;
    if (!checkoutUrl) {
      return errorResponse("PAY_LINK_REQUIRED", "Invoice pay link is not available for email send.", 409);
    }

    const email = renderInvoiceEmailTemplate({
      patientName: patient.fullName,
      clinicName: "Northview Clinic",
      invoiceNumber: refreshedInvoice.invoiceNumber,
      dueDate: refreshedInvoice.dueDate,
      total: refreshedInvoice.total,
      currency: refreshedInvoice.currency,
      payLinkUrl: checkoutUrl,
    });

    const delivery = await sendInvoiceEmailNotificationForClinic({
      clinicId: auth.clinicId,
      invoiceId: refreshedInvoice.id,
      invoiceNumber: refreshedInvoice.invoiceNumber,
      patientId: patient.id,
      patientEmail: patient.email,
      patientName: patient.fullName,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `invoice-send:${refreshedInvoice.id}`,
    });
    if (!delivery.ok) {
      return errorResponse(delivery.code, delivery.message, delivery.status, delivery.details);
    }

    const log = withRequestLogger({
      requestId,
      clinicId: auth.clinicId,
      userId: auth.userId,
      path: `/api/v1/invoices/${invoiceId}/send`,
      method: "POST",
    });
    log.info(
      {
        invoiceId,
        notificationId: delivery.data.notification.id,
        replayed: delivery.data.replayed,
        provider: delivery.data.provider,
      },
      "invoice_send_email_ok",
    );

    const response = successResponse({
      invoiceId: refreshedInvoice.id,
      invoiceNumber: refreshedInvoice.invoiceNumber,
      checkoutUrl,
      notificationId: delivery.data.notification.id,
      notificationStatus: delivery.data.notification.status,
      replayed: delivery.data.replayed,
      provider: delivery.data.provider,
      providerMessageId: delivery.data.providerMessageId,
      recipientEmail: patient.email,
    });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

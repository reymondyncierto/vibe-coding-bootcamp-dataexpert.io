import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  parseStripeWebhookEvent,
  processStripeWebhookEvent,
  verifyStripeWebhookSignature,
} from "@/services/stripeService";

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const rawBody = await request.text().catch(() => "");
    if (!rawBody) {
      return errorResponse("EMPTY_WEBHOOK_BODY", "Stripe webhook body is required.", 400);
    }

    const signatureCheck = verifyStripeWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get("stripe-signature"),
    });
    if (!signatureCheck.ok) {
      return errorResponse(signatureCheck.code, signatureCheck.message, signatureCheck.status, signatureCheck.details);
    }

    const parsedEvent = parseStripeWebhookEvent(rawBody);
    if (!parsedEvent.ok) {
      return errorResponse(parsedEvent.code, parsedEvent.message, parsedEvent.status, parsedEvent.details);
    }

    const processed = processStripeWebhookEvent(parsedEvent.data);
    if (!processed.ok) {
      return errorResponse(processed.code, processed.message, processed.status, processed.details);
    }

    const log = withRequestLogger({
      requestId,
      path: "/api/v1/webhooks/stripe",
      method: "POST",
    });
    log.info(
      {
        eventId: processed.data.eventId,
        action: processed.data.action,
        duplicate: processed.data.duplicate,
        invoiceId: processed.data.invoiceId ?? null,
      },
      "stripe_webhook_processed",
    );

    const response = successResponse(processed.data);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

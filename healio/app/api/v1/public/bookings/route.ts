import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { publicBookingCreateSchema } from "@/schemas/appointment";
import { createPublicBooking } from "@/services/bookingService";

export async function POST(request: Request) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const log = withRequestLogger({
      requestId,
      path: "/api/v1/public/bookings",
      method: "POST",
    });

    const rawBody = await request.json().catch(() => null);
    const parsed = publicBookingCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "Invalid booking payload.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const idempotencyKey = request.headers.get("idempotency-key")?.trim() || undefined;
    const result = await createPublicBooking(parsed.data, { idempotencyKey });
    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, result.details);
    }

    log.info(
      {
        clinicSlug: result.data.clinicSlug,
        serviceId: result.data.serviceId,
        appointmentId: result.data.appointmentId,
        replayed: result.replayed,
      },
      "public_booking_created",
    );

    const response = successResponse(result.data, { status: result.replayed ? 200 : 201 });
    response.headers.set("x-request-id", requestId);
    response.headers.set("x-idempotency-key", result.idempotencyKey);
    return response;
  });
}

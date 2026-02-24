import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import { publicSlotsQuerySchema, publicSlotsResponseSchema } from "@/schemas/appointment";
import { clinicSlugParamSchema } from "@/schemas/clinic";
import { getPublicSlotsByClinicSlug } from "@/services/appointmentService";

export async function GET(
  request: Request,
  context: { params: { slug: string } },
) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const url = new URL(request.url);
    const log = withRequestLogger({
      requestId,
      path: `/api/v1/public/clinics/${context.params.slug}/slots`,
      method: "GET",
    });

    const paramsParsed = clinicSlugParamSchema.safeParse(context.params);
    if (!paramsParsed.success) {
      return errorResponse("INVALID_SLUG", "Invalid clinic slug.", 400, {
        issues: paramsParsed.error.flatten(),
      });
    }

    const queryParsed = publicSlotsQuerySchema.safeParse({
      date: url.searchParams.get("date"),
      serviceId: url.searchParams.get("serviceId"),
    });
    if (!queryParsed.success) {
      return errorResponse("INVALID_QUERY", "Invalid slots query.", 400, {
        issues: queryParsed.error.flatten(),
      });
    }

    const result = await getPublicSlotsByClinicSlug({
      clinicSlug: paramsParsed.data.slug,
      date: queryParsed.data.date,
      serviceId: queryParsed.data.serviceId,
    });

    if (!result.ok) {
      const message =
        result.code === "SERVICE_NOT_FOUND" ? "Service not found." : "Clinic not found.";
      const status = result.code === "SERVICE_NOT_FOUND" ? 404 : 404;
      return errorResponse(result.code, message, status);
    }

    const payload = publicSlotsResponseSchema.parse({
      clinicSlug: result.clinic.slug,
      date: result.date,
      timezone: result.timezone,
      service: {
        id: result.service.id,
        name: result.service.name,
        durationMinutes: result.service.durationMinutes,
      },
      slots: result.slots,
    });

    log.info(
      {
        clinicSlug: payload.clinicSlug,
        date: payload.date,
        serviceId: payload.service.id,
        count: payload.slots.length,
      },
      "public_slots_ok",
    );

    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

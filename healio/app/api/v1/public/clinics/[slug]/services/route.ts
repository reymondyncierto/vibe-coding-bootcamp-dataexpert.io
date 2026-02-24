import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  clinicSlugParamSchema,
  publicServiceListSchema,
} from "@/schemas/clinic";
import { getPublicServicesByClinicSlug } from "@/services/serviceService";

export async function GET(
  request: Request,
  context: { params: { slug: string } },
) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const parsed = clinicSlugParamSchema.safeParse(context.params);
    if (!parsed.success) {
      return errorResponse("INVALID_SLUG", "Invalid clinic slug.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const log = withRequestLogger({
      requestId,
      path: `/api/v1/public/clinics/${parsed.data.slug}/services`,
      method: "GET",
    });

    const services = await getPublicServicesByClinicSlug(parsed.data.slug);
    if (!services) {
      return errorResponse("CLINIC_NOT_FOUND", "Clinic not found.", 404);
    }

    const payload = publicServiceListSchema.parse(services);
    log.info({ clinicSlug: parsed.data.slug, count: payload.length }, "public_services_ok");
    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

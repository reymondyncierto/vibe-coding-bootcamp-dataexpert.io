import {
  errorResponse,
  successResponse,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";
import {
  clinicSlugParamSchema,
  publicClinicProfileSchema,
} from "@/schemas/clinic";
import { getPublicClinicProfileBySlug } from "@/services/clinicPublicService";

export async function GET(
  request: Request,
  context: { params: { slug: string } },
) {
  return withRouteErrorHandling(async () => {
    const requestId = getRequestId(request.headers);
    const log = withRequestLogger({
      requestId,
      path: `/api/v1/public/clinics/${context.params.slug}`,
      method: "GET",
    });

    const parsed = clinicSlugParamSchema.safeParse(context.params);
    if (!parsed.success) {
      return errorResponse("INVALID_SLUG", "Invalid clinic slug.", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const clinic = await getPublicClinicProfileBySlug(parsed.data.slug);
    if (!clinic) {
      return errorResponse("CLINIC_NOT_FOUND", "Clinic not found.", 404);
    }

    const payload = publicClinicProfileSchema.parse(clinic);
    log.info({ clinicSlug: payload.slug }, "public_clinic_profile_ok");
    const response = successResponse(payload);
    response.headers.set("x-request-id", requestId);
    return response;
  });
}

import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { markOverdueInvoicesForClinicSweep } from "@/services/invoiceService";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return { ok: false as const, response: errorResponse("CRON_SECRET_MISSING", "CRON_SECRET is not configured.", 500) };
  const auth = request.headers.get("authorization")?.trim();
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const header = request.headers.get("x-cron-secret")?.trim();
  if ((bearer || header) !== secret) {
    return { ok: false as const, response: errorResponse("FORBIDDEN", "Invalid cron secret.", 403) };
  }
  return { ok: true as const };
}

function parseNow(url: URL) {
  const raw = url.searchParams.get("now");
  if (!raw) return new Date();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function run(request: Request) {
  const auth = authorizeCron(request);
  if (!auth.ok) return auth.response;
  const now = parseNow(new URL(request.url));
  if (!now) return errorResponse("INVALID_NOW", "Invalid `now` query parameter.", 400);

  return successResponse(markOverdueInvoicesForClinicSweep({ now }));
}

export async function GET(request: Request) {
  return withRouteErrorHandling(() => run(request));
}

export async function POST(request: Request) {
  return withRouteErrorHandling(() => run(request));
}

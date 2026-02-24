import { NextResponse, type NextRequest } from "next/server";

import {
  consumeRateLimit,
  getRateLimitIdentifier,
  rateLimitHeaders,
  resolveApiRateLimitPolicy,
} from "@/lib/rate-limit";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

type HealioRole = "OWNER" | "DOCTOR" | "RECEPTIONIST";

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/v1/");
}

function isPublicApi(pathname: string) {
  return pathname.startsWith("/api/v1/public/") || pathname === "/api/v1/health";
}

function isProtectedDashboard(pathname: string) {
  return pathname.startsWith("/dashboard");
}

function isLocalDevHeaderBypass(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const hostname = request.nextUrl.hostname;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocalHost) return false;

  const clinicId = request.headers.get("x-healio-clinic-id")?.trim();
  const userId = request.headers.get("x-healio-user-id")?.trim();
  const role = request.headers.get("x-healio-role")?.trim();
  return Boolean(clinicId && userId && role);
}

function requiredDashboardRoles(pathname: string): HealioRole[] | null {
  if (!isProtectedDashboard(pathname)) return null;
  if (pathname.startsWith("/dashboard/settings")) return ["OWNER"];
  if (pathname.startsWith("/dashboard/billing")) return ["OWNER", "RECEPTIONIST"];
  return ["OWNER", "DOCTOR", "RECEPTIONIST"];
}

function applyHeaders(response: NextResponse, headers: Record<string, string>) {
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

function jsonError(
  request: NextRequest,
  status: number,
  code: string,
  message: string,
  extraHeaders?: Record<string, string>,
) {
  const response = NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
  response.headers.set("x-healio-path", request.nextUrl.pathname);
  if (extraHeaders) {
    applyHeaders(response, extraHeaders);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let rateLimitResult:
    | ReturnType<typeof consumeRateLimit>
    | null = null;

  const policy = resolveApiRateLimitPolicy(pathname);
  if (policy) {
    const identifier = getRateLimitIdentifier(request.headers, "edge-anon");
    const bucketKey = `${policy.name}:${identifier}`;
    rateLimitResult = consumeRateLimit(bucketKey, policy);
    if (!rateLimitResult.allowed) {
      return jsonError(
        request,
        429,
        "RATE_LIMITED",
        "Too many requests. Please retry shortly.",
        rateLimitHeaders(rateLimitResult),
      );
    }
  }

  const needsAuth = isProtectedDashboard(pathname) || (isApiRoute(pathname) && !isPublicApi(pathname));
  if (!needsAuth) {
    return NextResponse.next();
  }

  if (isApiRoute(pathname) && isLocalDevHeaderBypass(request)) {
    const response = NextResponse.next();
    const clinicId = request.headers.get("x-healio-clinic-id");
    const userId = request.headers.get("x-healio-user-id");
    const role = request.headers.get("x-healio-role");
    if (clinicId) response.headers.set("x-healio-clinic-id", clinicId);
    if (userId) response.headers.set("x-healio-user-id", userId);
    if (role) response.headers.set("x-healio-role", role);
    if (rateLimitResult) {
      applyHeaders(response, rateLimitHeaders(rateLimitResult));
    }
    return response;
  }

  const session = await updateSupabaseSession(request);
  const response = session.response;

  if (!session.user) {
    if (isApiRoute(pathname)) {
      return jsonError(
        request,
        401,
        "UNAUTHENTICATED",
        "Authentication required.",
        rateLimitResult ? rateLimitHeaders(rateLimitResult) : undefined,
      );
    }
    const signInUrl = new URL("/auth/login", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (!session.authContext) {
    if (isApiRoute(pathname)) {
      return jsonError(
        request,
        403,
        "INVALID_AUTH_CONTEXT",
        "Missing required clinic or role claims.",
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const allowedRoles = requiredDashboardRoles(pathname);
  if (allowedRoles && !allowedRoles.includes(session.authContext.role as HealioRole)) {
    if (isApiRoute(pathname)) {
      return jsonError(request, 403, "FORBIDDEN", "Insufficient role for this route.");
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  response.headers.set("x-healio-user-id", session.authContext.userId);
  response.headers.set("x-healio-clinic-id", session.authContext.clinicId);
  response.headers.set("x-healio-role", session.authContext.role);

  if (rateLimitResult) {
    applyHeaders(response, rateLimitHeaders(rateLimitResult));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*"],
};

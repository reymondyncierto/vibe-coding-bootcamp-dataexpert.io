import { NextResponse } from "next/server";

import { successResponse } from "@/lib/api-helpers";
import { withRequestLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  const log = withRequestLogger({
    requestId,
    path: "/api/v1/health",
    method: "GET",
  });

  const payload = {
    status: "ok" as const,
    service: "healio",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "0.1.0",
    checks: {
      envLoaded: true,
      db: "not_checked" as const,
    },
  };

  log.info({ durationMs: Date.now() - startedAt }, "healthcheck_ok");

  const response = successResponse(payload);
  response.headers.set("x-request-id", requestId);
  response.headers.set("cache-control", "no-store");
  return response as NextResponse;
}

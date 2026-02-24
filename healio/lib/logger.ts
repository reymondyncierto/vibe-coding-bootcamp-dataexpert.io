import pino from "pino";

type BaseLogBindings = {
  requestId?: string;
  clinicId?: string;
  userId?: string;
  path?: string;
  method?: string;
};

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info");
const redactPaths = [
  "req.headers.authorization",
  "headers.authorization",
  "authorization",
  "stripeSignature",
  "patient.email",
  "patient.phone",
  "email",
  "phone",
  "*.email",
  "*.phone",
];

export const logger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export function withRequestLogger(bindings: BaseLogBindings) {
  return logger.child(bindings);
}

export function logOperationalEvent(
  event: string,
  data: Record<string, unknown> = {},
  bindings: BaseLogBindings = {},
) {
  withRequestLogger(bindings).info({ event, ...data }, "operational_event");
}

export function logHealthcheckResult(input: {
  requestId?: string;
  durationMs: number;
  status: "ok" | "degraded" | "error";
  checks?: Record<string, unknown>;
}) {
  withRequestLogger({
    requestId: input.requestId,
    path: "/api/v1/health",
    method: "GET",
  }).info(
    {
      event: "healthcheck_result",
      durationMs: input.durationMs,
      status: input.status,
      checks: input.checks ?? {},
    },
    "healthcheck_observed",
  );
}

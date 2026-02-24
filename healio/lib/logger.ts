import pino from "pino";

type BaseLogBindings = {
  requestId?: string;
  clinicId?: string;
  userId?: string;
  path?: string;
  method?: string;
};

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info");

export const logger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export function withRequestLogger(bindings: BaseLogBindings) {
  return logger.child(bindings);
}

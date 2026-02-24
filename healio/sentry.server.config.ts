type HealioSentryServerConfig = {
  enabled: boolean;
  dsn: string | null;
  environment: string;
  tracesSampleRate: number;
};

export function getSentryServerConfig(): HealioSentryServerConfig {
  const dsn = process.env.SENTRY_DSN?.trim() || null;
  return {
    enabled: Boolean(dsn),
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  };
}

export function initHealioServerSentry() {
  const config = getSentryServerConfig();
  if (!config.enabled) return config;

  // Placeholder for future @sentry/nextjs initialization.
  // Kept lightweight so the app can compile without Sentry SDK in local/dev CI.
  return config;
}

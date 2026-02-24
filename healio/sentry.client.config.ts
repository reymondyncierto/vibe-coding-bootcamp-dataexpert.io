type HealioSentryClientConfig = {
  enabled: boolean;
  dsn: string | null;
  environment: string;
  tracesSampleRate: number;
};

export function getSentryClientConfig(): HealioSentryClientConfig {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || null;
  return {
    enabled: Boolean(dsn),
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.05"),
  };
}

export function initHealioClientSentry() {
  const config = getSentryClientConfig();
  if (!config.enabled) return config;

  // Placeholder for future @sentry/nextjs browser initialization.
  return config;
}

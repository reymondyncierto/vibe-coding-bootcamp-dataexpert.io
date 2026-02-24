import "server-only";

type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
};

type ServerEnv = PublicEnv & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  DATABASE_URL: string;
  DIRECT_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  CRON_SECRET: string;
  ENCRYPTION_KEY: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
};

const REQUIRED_PUBLIC_KEYS: Array<keyof PublicEnv> = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL"
];

const REQUIRED_SERVER_KEYS: Array<keyof Omit<
  ServerEnv,
  | "TWILIO_ACCOUNT_SID"
  | "TWILIO_AUTH_TOKEN"
  | "TWILIO_PHONE_NUMBER"
  | "UPSTASH_REDIS_REST_URL"
  | "UPSTASH_REDIS_REST_TOKEN"
>> = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "ENCRYPTION_KEY"
];

function readRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function validateEncryptionKey(value: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32-byte key)."
    );
  }
  return value;
}

export function getPublicEnv(): PublicEnv {
  const env = {} as PublicEnv;
  for (const key of REQUIRED_PUBLIC_KEYS) {
    env[key] = readRequired(key);
  }
  return env;
}

export function getServerEnv(): ServerEnv {
  const env = {} as ServerEnv;

  for (const key of REQUIRED_SERVER_KEYS) {
    env[key] = readRequired(key);
  }

  env.ENCRYPTION_KEY = validateEncryptionKey(env.ENCRYPTION_KEY);

  env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || undefined;
  env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || undefined;
  env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || undefined;
  env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || undefined;
  env.UPSTASH_REDIS_REST_TOKEN =
    process.env.UPSTASH_REDIS_REST_TOKEN || undefined;

  return env;
}

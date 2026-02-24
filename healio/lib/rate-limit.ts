export type RateLimitPolicyName = "publicApi" | "authApi" | "privateApi";

export interface RateLimitPolicy {
  name: RateLimitPolicyName;
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  policy: RateLimitPolicy;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

type CounterRecord = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_POLICIES: Record<RateLimitPolicyName, RateLimitPolicy> = {
  publicApi: { name: "publicApi", windowMs: 60_000, max: 50 },
  authApi: { name: "authApi", windowMs: 60_000, max: 10 },
  privateApi: { name: "privateApi", windowMs: 60_000, max: 100 },
};

const globalRateLimitState = globalThis as typeof globalThis & {
  __healio_rate_limit_store__?: Map<string, CounterRecord>;
};

function getStore() {
  if (!globalRateLimitState.__healio_rate_limit_store__) {
    globalRateLimitState.__healio_rate_limit_store__ = new Map();
  }
  return globalRateLimitState.__healio_rate_limit_store__;
}

export function resolveApiRateLimitPolicy(pathname: string): RateLimitPolicy | null {
  if (!pathname.startsWith("/api/v1/")) return null;
  if (pathname.startsWith("/api/v1/public/")) return RATE_LIMIT_POLICIES.publicApi;
  if (pathname.startsWith("/api/v1/auth/")) return RATE_LIMIT_POLICIES.authApi;
  return RATE_LIMIT_POLICIES.privateApi;
}

export function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now(),
): RateLimitResult {
  const store = getStore();
  const existing = store.get(key);
  const resetAt =
    existing && existing.resetAt > now ? existing.resetAt : now + policy.windowMs;
  const count =
    existing && existing.resetAt > now ? existing.count + 1 : 1;

  const record: CounterRecord = { count, resetAt };
  store.set(key, record);

  const remaining = Math.max(policy.max - count, 0);
  const allowed = count <= policy.max;
  const retryAfterSeconds = Math.max(Math.ceil((resetAt - now) / 1000), 1);

  return {
    allowed,
    policy,
    limit: policy.max,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}

export function getRateLimitIdentifier(headers: Headers, fallback = "anonymous") {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const candidate =
    forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || fallback;
  return candidate || fallback;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "x-ratelimit-policy": result.policy.name,
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(Math.floor(result.resetAt / 1000)),
    "retry-after": String(result.retryAfterSeconds),
  };
}

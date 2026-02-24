import test from "node:test";
import assert from "node:assert/strict";

import {
  consumeRateLimit,
  resolveApiRateLimitPolicy,
  type RateLimitPolicy,
} from "@/lib/rate-limit";

test("resolveApiRateLimitPolicy maps API routes to expected policies", () => {
  assert.equal(resolveApiRateLimitPolicy("/api/v1/public/slots")?.name, "publicApi");
  assert.equal(resolveApiRateLimitPolicy("/api/v1/auth/login")?.name, "authApi");
  assert.equal(resolveApiRateLimitPolicy("/api/v1/patients")?.name, "privateApi");
  assert.equal(resolveApiRateLimitPolicy("/dashboard"), null);
});

test("consumeRateLimit blocks after limit is exceeded within the same window", () => {
  const policy: RateLimitPolicy = {
    name: "publicApi",
    windowMs: 60_000,
    max: 2,
  };

  const now = 1_700_000_000_000;
  const key = `test:${Date.now()}`;

  const first = consumeRateLimit(key, policy, now);
  const second = consumeRateLimit(key, policy, now + 10);
  const third = consumeRateLimit(key, policy, now + 20);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.limit, 2);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterSeconds >= 1);
});

import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "@/app/api/v1/subscription/checkout/route";
import { resetSubscriptionStoreForTests } from "@/services/subscriptionService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "OWNER",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetSubscriptionStoreForTests();
});

test("subscription checkout GET returns current subscription and plan catalog", async () => {
  const response = await GET(new Request("http://localhost:3000/api/v1/subscription/checkout", { headers: authHeaders() }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.subscription.plan, "STARTER");
  assert.equal(body.data.plans.length, 3);
});

test("subscription checkout POST creates upgrade checkout and blocks same-plan checkout", async () => {
  const create = await POST(new Request("http://localhost:3000/api/v1/subscription/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "ADMIN" }) },
    body: JSON.stringify({ plan: "GROWTH" }),
  }));
  assert.equal(create.status, 200);
  const createdBody = await create.json();
  assert.equal(createdBody.success, true);
  assert.equal(createdBody.data.subscription.pendingUpgradePlan, "GROWTH");
  assert.match(createdBody.data.checkoutUrl, /payments\/mock-checkout|http/);

  const samePlan = await POST(new Request("http://localhost:3000/api/v1/subscription/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plan: "STARTER" }),
  }));
  assert.equal(samePlan.status, 409);
  const samePlanBody = await samePlan.json();
  assert.equal(samePlanBody.success, false);
  assert.equal(samePlanBody.error.code, "PLAN_ALREADY_ACTIVE");
});

test("subscription checkout POST enforces auth/rbac and validates payload", async () => {
  const unauthenticated = await POST(new Request("http://localhost:3000/api/v1/subscription/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: "GROWTH" }),
  }));
  assert.equal(unauthenticated.status, 401);

  const forbidden = await POST(new Request("http://localhost:3000/api/v1/subscription/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "FRONT_DESK" }) },
    body: JSON.stringify({ plan: "GROWTH" }),
  }));
  assert.equal(forbidden.status, 403);

  const invalid = await POST(new Request("http://localhost:3000/api/v1/subscription/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plan: "ENTERPRISE" }),
  }));
  assert.equal(invalid.status, 400);
});

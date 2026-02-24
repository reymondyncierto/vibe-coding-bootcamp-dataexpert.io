import assert from "node:assert/strict";
import test from "node:test";

import { GET, PATCH } from "@/app/api/v1/clinics/route";
import { resetClinicSettingsStoreForTests } from "@/services/clinicService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_owner_1",
    "x-healio-role": "OWNER",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetClinicSettingsStoreForTests();
});

test("clinics route GET returns clinic profile and booking rules", async () => {
  const response = await GET(new Request("http://localhost:3000/api/v1/clinics", { headers: authHeaders() }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.id, "clinic_1");
  assert.equal(typeof body.data.bookingRules.leadTimeMinutes, "number");
  assert.equal(body.data.operatingHours.length, 7);
});

test("clinics route PATCH updates profile and booking rules for owner/admin only", async () => {
  const forbidden = await PATCH(new Request("http://localhost:3000/api/v1/clinics", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "FRONT_DESK" }) },
    body: JSON.stringify({ name: "Northview Updated" }),
  }));
  assert.equal(forbidden.status, 403);

  const patchResponse = await PATCH(new Request("http://localhost:3000/api/v1/clinics", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "ADMIN" }) },
    body: JSON.stringify({
      name: "Northview Updated",
      isPublicBookingEnabled: false,
      bookingRules: { leadTimeMinutes: 180, requirePhoneForBooking: false },
    }),
  }));
  assert.equal(patchResponse.status, 200);
  const patchBody = await patchResponse.json();
  assert.equal(patchBody.success, true);
  assert.equal(patchBody.data.name, "Northview Updated");
  assert.equal(patchBody.data.isPublicBookingEnabled, false);
  assert.equal(patchBody.data.bookingRules.leadTimeMinutes, 180);
  assert.equal(patchBody.data.bookingRules.requirePhoneForBooking, false);

  const getAfter = await GET(new Request("http://localhost:3000/api/v1/clinics", { headers: authHeaders() }));
  const getBody = await getAfter.json();
  assert.equal(getBody.data.name, "Northview Updated");
  assert.equal(getBody.data.bookingRules.leadTimeMinutes, 180);
});

test("clinics route validates auth and patch payload", async () => {
  const unauthenticated = await GET(new Request("http://localhost:3000/api/v1/clinics"));
  assert.equal(unauthenticated.status, 401);

  const invalidPatch = await PATCH(new Request("http://localhost:3000/api/v1/clinics", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ bookingRules: { leadTimeMinutes: -1 } }),
  }));
  assert.equal(invalidPatch.status, 400);
  const body = await invalidPatch.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, "INVALID_BODY");
});

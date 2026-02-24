import assert from "node:assert/strict";
import test from "node:test";

import { POST as provisionRoute } from "@/app/api/auth/provision/route";
import { resetAuthProvisioningStoreForTests } from "@/services/authProvisioningService";
import { resetClinicSettingsStoreForTests } from "@/services/clinicService";

test.beforeEach(() => {
  resetAuthProvisioningStoreForTests();
  resetClinicSettingsStoreForTests();
});

test("auth provision route provisions and replays clinic onboarding", async () => {
  const first = await provisionRoute(
    new Request("http://localhost:3000/api/auth/provision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: "user_signup_1",
        email: "owner@example.com",
        fullName: "Dr. Owner",
        clinicName: "Owner Family Clinic",
        clinicSlug: "owner-family-clinic",
        timezone: "Asia/Manila",
        currency: "PHP",
        source: "signup",
      }),
    }),
  );
  assert.equal(first.status, 201);
  const firstJson = await first.json();
  assert.equal(firstJson.success, true);
  assert.equal(firstJson.data.replayed, false);
  assert.equal(firstJson.data.authContext.role, "OWNER");
  assert.equal(firstJson.data.clinic.slug.startsWith("owner-family-clinic"), true);

  const replay = await provisionRoute(
    new Request("http://localhost:3000/api/auth/provision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: "user_signup_1",
        email: "owner@example.com",
        fullName: "Dr. Owner",
        clinicName: "Owner Family Clinic Updated",
        source: "manual",
      }),
    }),
  );
  assert.equal(replay.status, 200);
  const replayJson = await replay.json();
  assert.equal(replayJson.success, true);
  assert.equal(replayJson.data.replayed, true);
  assert.equal(replayJson.data.clinic.name, "Owner Family Clinic Updated");
});

test("auth provision route validates payload", async () => {
  const invalid = await provisionRoute(
    new Request("http://localhost:3000/api/auth/provision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "bad", clinicName: "" }),
    }),
  );
  assert.equal(invalid.status, 400);
});


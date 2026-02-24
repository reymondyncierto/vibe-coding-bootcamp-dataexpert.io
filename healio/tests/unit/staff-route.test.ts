import assert from "node:assert/strict";
import test from "node:test";

import { GET as listStaff, POST as inviteStaff } from "@/app/api/v1/staff/route";
import { listNotificationsForClinic, resetNotificationStoresForTests } from "@/services/notificationService";
import { resetClinicSettingsStoreForTests } from "@/services/clinicService";
import { resetStaffStoreForTests } from "@/services/staffService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_owner_1",
    "x-healio-role": "OWNER",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetStaffStoreForTests();
  resetNotificationStoresForTests();
  resetClinicSettingsStoreForTests();
});

test("staff route lists clinic staff and invites a new member with email notification", async () => {
  const listResponse = await listStaff(new Request("http://localhost:3000/api/v1/staff", { headers: authHeaders() }));
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.success, true);
  assert.equal(listBody.data.items.length >= 3, true);

  const inviteResponse = await inviteStaff(new Request("http://localhost:3000/api/v1/staff", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "ADMIN" }) },
    body: JSON.stringify({
      name: "Mia Gomez",
      email: "mia.gomez@example.com",
      role: "NURSE",
      specialization: "Triage",
    }),
  }));
  assert.equal(inviteResponse.status, 201);
  const inviteBody = await inviteResponse.json();
  assert.equal(inviteBody.success, true);
  assert.equal(inviteBody.data.staff.status, "INVITED");
  assert.equal(inviteBody.data.staff.role, "NURSE");
  assert.equal(inviteBody.data.inviteEmail.provider.includes("resend"), true);

  const notifications = listNotificationsForClinic({ clinicId: "clinic_1", type: "STAFF_INVITE" as any });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].recipientEmail, "mia.gomez@example.com");
  assert.equal(notifications[0].status, "SENT");

  const duplicateInvite = await inviteStaff(new Request("http://localhost:3000/api/v1/staff", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name: "Mia Gomez", email: "mia.gomez@example.com", role: "NURSE" }),
  }));
  assert.equal(duplicateInvite.status, 409);
});

test("staff route enforces auth and owner/admin invite permissions", async () => {
  const unauth = await listStaff(new Request("http://localhost:3000/api/v1/staff"));
  assert.equal(unauth.status, 401);

  const forbidden = await inviteStaff(new Request("http://localhost:3000/api/v1/staff", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "FRONT_DESK" }) },
    body: JSON.stringify({ name: "Test", email: "test@example.com", role: "RECEPTIONIST" }),
  }));
  assert.equal(forbidden.status, 403);

  const invalid = await inviteStaff(new Request("http://localhost:3000/api/v1/staff", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name: "", email: "bad", role: "NOPE" }),
  }));
  assert.equal(invalid.status, 400);
});

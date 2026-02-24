import assert from "node:assert/strict";
import test from "node:test";

import { GET as auditLogsRoute } from "@/app/api/v1/audit-logs/route";
import { appendAuditLogEntry, resetAuditLogStoreForTests } from "@/services/auditLogService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_owner_1",
    "x-healio-role": "OWNER",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetAuditLogStoreForTests();
  appendAuditLogEntry({
    clinicId: "clinic_1",
    actorUserId: "user_owner_1",
    actorRole: "OWNER",
    action: "CLINIC_SETTINGS_UPDATED",
    entityType: "clinic",
    entityId: "clinic_1",
    summary: "Updated booking rules.",
  });
  appendAuditLogEntry({
    clinicId: "clinic_1",
    actorUserId: "user_owner_1",
    actorRole: "OWNER",
    action: "INVOICE_SENT",
    entityType: "invoice",
    entityId: "inv_1",
    summary: "Sent invoice to patient.",
  });
  appendAuditLogEntry({
    clinicId: "clinic_2",
    actorUserId: "user_owner_2",
    actorRole: "OWNER",
    action: "STAFF_INVITE_SENT",
    entityType: "staff",
    entityId: "staff_2",
    summary: "Invited doctor.",
  });
});

test("audit log route is owner-only and clinic-scoped", async () => {
  const response = await auditLogsRoute(
    new Request("http://localhost:3000/api/v1/audit-logs?page=1&pageSize=10", {
      headers: authHeaders(),
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.total, 2);
  assert.equal(body.data.items.every((item: any) => item.clinicId === "clinic_1"), true);
  assert.equal(body.data.chainIntegrity.ok, true);
});

test("audit log route supports filters and validates auth", async () => {
  const filtered = await auditLogsRoute(
    new Request("http://localhost:3000/api/v1/audit-logs?action=INVOICE_SENT", {
      headers: authHeaders(),
    }),
  );
  assert.equal(filtered.status, 200);
  const filteredBody = await filtered.json();
  assert.equal(filteredBody.data.total, 1);
  assert.equal(filteredBody.data.items[0].action, "INVOICE_SENT");

  const unauth = await auditLogsRoute(new Request("http://localhost:3000/api/v1/audit-logs"));
  assert.equal(unauth.status, 401);

  const forbidden = await auditLogsRoute(
    new Request("http://localhost:3000/api/v1/audit-logs", {
      headers: authHeaders({ "x-healio-role": "RECEPTIONIST" }),
    }),
  );
  assert.equal(forbidden.status, 403);

  const invalid = await auditLogsRoute(
    new Request("http://localhost:3000/api/v1/audit-logs?page=0", {
      headers: authHeaders(),
    }),
  );
  assert.equal(invalid.status, 400);
});


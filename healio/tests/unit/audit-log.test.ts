import assert from "node:assert/strict";
import test from "node:test";

import {
  appendAuditLogEntry,
  deleteAuditLogEntry,
  listAuditLogsForClinic,
  resetAuditLogStoreForTests,
  unsafeTamperAuditLogForTests,
  updateAuditLogEntry,
  verifyAuditLogChainForClinic,
} from "@/services/auditLogService";

test.beforeEach(() => {
  resetAuditLogStoreForTests();
});

test("audit log appends entries, filters by clinic, and preserves hash chain", () => {
  const first = appendAuditLogEntry({
    clinicId: "clinic_1",
    actorUserId: "user_1",
    actorRole: "OWNER",
    action: "PATIENT_UPDATED",
    entityType: "patient",
    entityId: "pat_1",
    summary: "Updated patient contact information.",
    metadata: { fields: ["phone"] },
  });
  assert.equal(first.ok, true);

  const second = appendAuditLogEntry({
    clinicId: "clinic_1",
    actorUserId: "user_1",
    actorRole: "OWNER",
    action: "INVOICE_SENT",
    entityType: "invoice",
    entityId: "inv_1",
    summary: "Invoice emailed to patient.",
  });
  assert.equal(second.ok, true);

  const otherClinic = appendAuditLogEntry({
    clinicId: "clinic_2",
    actorUserId: "user_2",
    actorRole: "OWNER",
    action: "STAFF_INVITE_SENT",
    entityType: "staff",
    entityId: "staff_2",
    summary: "Invited new staff.",
  });
  assert.equal(otherClinic.ok, true);

  const list = listAuditLogsForClinic({ clinicId: "clinic_1", query: { page: 1, pageSize: 20 } });
  assert.equal(list.ok, true);
  if (!list.ok) return;
  assert.equal(list.data.total, 2);
  assert.equal(list.data.items.every((item) => item.clinicId === "clinic_1"), true);

  const filtered = listAuditLogsForClinic({
    clinicId: "clinic_1",
    query: { action: "INVOICE_SENT", page: 1, pageSize: 20 },
  });
  assert.equal(filtered.ok, true);
  if (!filtered.ok) return;
  assert.equal(filtered.data.total, 1);

  const chain = verifyAuditLogChainForClinic("clinic_1");
  assert.equal(chain.ok, true);
});

test("audit log immutability guards reject update/delete and hash tampering is detectable", () => {
  const created = appendAuditLogEntry({
    clinicId: "clinic_1",
    action: "CLINIC_SETTINGS_UPDATED",
    entityType: "clinic",
    entityId: "clinic_1",
    summary: "Updated clinic settings.",
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const updateResult = updateAuditLogEntry();
  assert.equal(updateResult.ok, false);
  if (updateResult.ok) return;
  assert.equal(updateResult.status, 405);

  const deleteResult = deleteAuditLogEntry();
  assert.equal(deleteResult.ok, false);
  if (deleteResult.ok) return;
  assert.equal(deleteResult.status, 405);

  const tampered = unsafeTamperAuditLogForTests({
    clinicId: "clinic_1",
    entryId: created.data.id,
    patch: { summary: "Tampered summary" },
  });
  assert.equal(tampered, true);

  const chain = verifyAuditLogChainForClinic("clinic_1");
  assert.equal(chain.ok, false);
  assert.equal(chain.brokenAtId, created.data.id);
});

import assert from "node:assert/strict";
import test from "node:test";

import { GET as runOverdueCron } from "@/app/api/cron/overdue-invoices/route";
import { GET as runSubscriptionCron } from "@/app/api/cron/subscription-check/route";
import { createInvoiceForClinic, getInvoiceByIdForClinic, resetInvoiceStoresForTests, updateInvoiceForClinic } from "@/services/invoiceService";
import { createSubscriptionCheckoutForClinic, getClinicSubscription, resetSubscriptionStoreForTests } from "@/services/subscriptionService";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

function cronHeaders() {
  return { authorization: "Bearer cron-test-secret" };
}

test.beforeEach(() => {
  resetInvoiceStoresForTests();
  resetSubscriptionStoreForTests();
  process.env.CRON_SECRET = "cron-test-secret";
});

test.after(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

test("overdue invoices cron marks unpaid past-due invoices as OVERDUE and enforces cron secret", async () => {
  const blocked = await runOverdueCron(new Request("http://localhost:3000/api/cron/overdue-invoices"));
  assert.equal(blocked.status, 403);

  const created = createInvoiceForClinic({
    clinicId: "clinic_1",
    patientId: "pat_1",
    dueDate: "2026-02-20T00:00:00.000Z",
    currency: "PHP",
    items: [{ description: "Consult", quantity: 1, unitPrice: "1000.00" }],
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const sent = updateInvoiceForClinic({
    clinicId: "clinic_1",
    invoiceId: created.data.id,
    patch: { status: "SENT" },
  });
  assert.equal(sent.ok, true);

  const response = await runOverdueCron(new Request(
    "http://localhost:3000/api/cron/overdue-invoices?now=2026-02-24T00:00:00.000Z",
    { headers: cronHeaders() },
  ));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.updated, 1);
  assert.equal(body.data.updatedInvoiceIds.length, 1);

  const invoice = getInvoiceByIdForClinic("clinic_1", created.data.id);
  assert.equal(invoice?.status, "OVERDUE");
});

test("subscription check cron marks stale pending upgrades as past due", async () => {
  const createCheckout = await createSubscriptionCheckoutForClinic({
    clinicId: "clinic_1",
    targetPlan: "GROWTH",
    requestOrigin: "http://localhost:3000",
  });
  assert.equal(createCheckout.ok, true);
  if (!createCheckout.ok) return;

  const first = await runSubscriptionCron(new Request(
    "http://localhost:3000/api/cron/subscription-check?now=2026-02-24T00:00:00.000Z&graceDays=999",
    { headers: cronHeaders() },
  ));
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.success, true);
  assert.equal(firstBody.data.markedPastDue, 0);

  const second = await runSubscriptionCron(new Request(
    "http://localhost:3000/api/cron/subscription-check?now=2030-01-01T00:00:00.000Z&graceDays=0",
    { headers: cronHeaders() },
  ));
  assert.equal(second.status, 200);
  const secondBody = await second.json();
  assert.equal(secondBody.success, true);
  assert.equal(secondBody.data.markedPastDue, 1);

  const subscription = getClinicSubscription("clinic_1");
  assert.equal(subscription.status, "PAST_DUE");
});

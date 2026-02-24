import assert from "node:assert/strict";
import test from "node:test";

import { centsToMoney, moneyToCents } from "@/lib/utils";
import {
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoicesListQuerySchema,
} from "@/schemas/invoice";
import {
  calculateInvoiceTotals,
  createInvoiceForClinic,
  generateInvoiceNumberForClinic,
  getInvoiceByIdForClinic,
  listInvoicesForClinic,
  resetInvoiceStoresForTests,
  updateInvoiceForClinic,
} from "@/services/invoiceService";

test.beforeEach(() => {
  resetInvoiceStoresForTests();
});

test("money helpers and invoice schemas parse valid payloads", () => {
  assert.equal(moneyToCents("12.34"), 1234);
  assert.equal(centsToMoney(1234), "12.34");

  const create = invoiceCreateSchema.parse({
    clinicId: "clinic_1",
    patientId: "pat_1",
    dueDate: "2026-03-01T00:00:00.000Z",
    currency: "PHP",
    items: [{ description: "Consultation", quantity: 1, unitPrice: "1200.00" }],
    taxRatePercent: 12,
  });
  assert.equal(create.items[0].description, "Consultation");

  const list = invoicesListQuerySchema.parse({ patientId: "pat_1", page: 2, pageSize: 10 });
  assert.equal(list.page, 2);

  const update = invoiceUpdateSchema.parse({ status: "SENT", paidAmount: "0.00" });
  assert.equal(update.status, "SENT");
});

test("calculateInvoiceTotals computes subtotal tax and total from items and tax rate", () => {
  const totals = calculateInvoiceTotals({
    items: [
      { quantity: 2, unitPrice: "500.00" },
      { quantity: 1, unitPrice: "250.50" },
    ],
    taxRatePercent: 12,
  });

  assert.equal(totals.subtotal, "1250.50");
  assert.equal(totals.tax, "150.06");
  assert.equal(totals.total, "1400.56");
});

test("invoice numbering is clinic/year scoped and increments sequentially", () => {
  const d1 = new Date("2026-01-01T00:00:00.000Z");
  const d2 = new Date("2027-01-01T00:00:00.000Z");

  assert.equal(generateInvoiceNumberForClinic("clinic_1", d1), "INV-2026-00001");
  assert.equal(generateInvoiceNumberForClinic("clinic_1", d1), "INV-2026-00002");
  assert.equal(generateInvoiceNumberForClinic("clinic_2", d1), "INV-2026-00001");
  assert.equal(generateInvoiceNumberForClinic("clinic_1", d2), "INV-2027-00001");
});

test("invoice service creates lists and tenant-scopes invoices", () => {
  const createdA = createInvoiceForClinic({
    clinicId: "clinic_1",
    patientId: "pat_1",
    dueDate: "2026-03-01T00:00:00.000Z",
    currency: "PHP",
    items: [{ description: "Consultation", quantity: 1, unitPrice: "1000.00" }],
    taxAmount: "120.00",
  });
  assert.equal(createdA.ok, true);

  const createdB = createInvoiceForClinic({
    clinicId: "clinic_2",
    patientId: "pat_2",
    dueDate: "2026-03-05T00:00:00.000Z",
    currency: "PHP",
    items: [{ description: "Procedure", quantity: 1, unitPrice: "2000.00" }],
  });
  assert.equal(createdB.ok, true);

  const listClinic1 = listInvoicesForClinic({ clinicId: "clinic_1", query: { page: 1, pageSize: 20 } });
  assert.equal(listClinic1.ok, true);
  if (listClinic1.ok) {
    assert.equal(listClinic1.data.total, 1);
    assert.equal(listClinic1.data.items[0].patientId, "pat_1");
  }

  const listWrongClinic = getInvoiceByIdForClinic(
    "clinic_1",
    createdB.ok ? createdB.data.id : "missing",
  );
  assert.equal(listWrongClinic, null);
});

test("invoice service blocks duplicate appointment invoice and validates updates", () => {
  const created = createInvoiceForClinic({
    clinicId: "clinic_1",
    patientId: "pat_1",
    appointmentId: "appt_1",
    dueDate: "2026-03-01T00:00:00.000Z",
    currency: "PHP",
    items: [{ description: "Consultation", quantity: 1, unitPrice: "1000.00" }],
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const duplicate = createInvoiceForClinic({
    clinicId: "clinic_1",
    patientId: "pat_1",
    appointmentId: "appt_1",
    dueDate: "2026-03-02T00:00:00.000Z",
    currency: "PHP",
    items: [{ description: "Duplicate", quantity: 1, unitPrice: "500.00" }],
  });
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.code, "APPOINTMENT_ALREADY_INVOICED");

  const sent = updateInvoiceForClinic({
    clinicId: "clinic_1",
    invoiceId: created.data.id,
    patch: { status: "SENT" },
  });
  assert.equal(sent.ok, true);

  const invalidPaidAmount = updateInvoiceForClinic({
    clinicId: "clinic_1",
    invoiceId: created.data.id,
    patch: { paidAmount: "999999.00" },
  });
  assert.equal(invalidPaidAmount.ok, false);
  if (!invalidPaidAmount.ok) assert.equal(invalidPaidAmount.code, "PAID_AMOUNT_EXCEEDS_TOTAL");

  const paid = updateInvoiceForClinic({
    clinicId: "clinic_1",
    invoiceId: created.data.id,
    patch: {
      status: "PAID",
      paidAmount: "1000.00",
      paymentMethod: "CASH",
    },
  });
  assert.equal(paid.ok, true);
  if (paid.ok) {
    assert.equal(paid.data.status, "PAID");
    assert.equal(paid.data.paymentMethod, "CASH");
    assert.equal(Boolean(paid.data.paidAt), true);
  }

  const backToDraft = updateInvoiceForClinic({
    clinicId: "clinic_1",
    invoiceId: created.data.id,
    patch: { status: "DRAFT" },
  });
  assert.equal(backToDraft.ok, false);
  if (!backToDraft.ok) assert.equal(backToDraft.code, "INVALID_STATUS_TRANSITION");
});

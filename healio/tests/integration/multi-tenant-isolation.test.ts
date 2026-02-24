import { beforeEach, describe, expect, it } from "vitest";

import { POST as createAppointment, GET as listAppointments } from "@/app/api/v1/appointments/route";
import { POST as createInvoice, GET as listInvoices } from "@/app/api/v1/invoices/route";
import { POST as createPatient, GET as listPatients } from "@/app/api/v1/patients/route";
import { resetInternalAppointmentStoreForTests } from "@/services/appointmentService";
import { resetInvoiceStoresForTests } from "@/services/invoiceService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";

function authHeaders(clinicId: string, role = "DOCTOR", userId = "user_1") {
  return {
    "x-healio-clinic-id": clinicId,
    "x-healio-user-id": userId,
    "x-healio-role": role,
  };
}

describe("multi-tenant isolation across core APIs", () => {
  beforeEach(() => {
    resetInternalPatientStoreForTests();
    resetInternalAppointmentStoreForTests();
    resetInvoiceStoresForTests();
  });

  it("isolates patients, appointments, and invoices by clinic", async () => {
    const patient1 = await createPatient(
      new Request("http://localhost:3000/api/v1/patients", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders("clinic_1") },
        body: JSON.stringify({
          firstName: "Clinic",
          lastName: "One",
          phone: "+639170000001",
          email: "clinic1@example.com",
        }),
      }),
    );
    expect(patient1.status).toBe(201);
    const patient1Body = (await patient1.json()) as any;

    const patient2 = await createPatient(
      new Request("http://localhost:3000/api/v1/patients", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders("clinic_2") },
        body: JSON.stringify({
          firstName: "Clinic",
          lastName: "Two",
          phone: "+639170000002",
          email: "clinic2@example.com",
        }),
      }),
    );
    expect(patient2.status).toBe(201);
    const patient2Body = (await patient2.json()) as any;

    const appt1 = await createAppointment(
      new Request("http://localhost:3000/api/v1/appointments", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders("clinic_1") },
        body: JSON.stringify({
          patientId: patient1Body.data.id,
          staffId: "staff_1",
          serviceId: "service_1",
          startTime: "2026-03-20T01:00:00.000Z",
          durationMinutes: 30,
          source: "STAFF",
        }),
      }),
    );
    expect(appt1.status).toBe(201);

    const appt2 = await createAppointment(
      new Request("http://localhost:3000/api/v1/appointments", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders("clinic_2") },
        body: JSON.stringify({
          patientId: patient2Body.data.id,
          staffId: "staff_2",
          serviceId: "service_1",
          startTime: "2026-03-20T03:00:00.000Z",
          durationMinutes: 30,
          source: "STAFF",
        }),
      }),
    );
    expect(appt2.status).toBe(201);

    const invoice1 = await createInvoice(
      new Request("http://localhost:3000/api/v1/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders("clinic_1") },
        body: JSON.stringify({
          patientId: patient1Body.data.id,
          dueDate: "2026-03-25T00:00:00.000Z",
          currency: "PHP",
          items: [{ description: "Consult", quantity: 1, unitPrice: "900.00" }],
        }),
      }),
    );
    expect(invoice1.status).toBe(201);

    const invoice2 = await createInvoice(
      new Request("http://localhost:3000/api/v1/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders("clinic_2") },
        body: JSON.stringify({
          patientId: patient2Body.data.id,
          dueDate: "2026-03-26T00:00:00.000Z",
          currency: "PHP",
          items: [{ description: "Procedure", quantity: 1, unitPrice: "1900.00" }],
        }),
      }),
    );
    expect(invoice2.status).toBe(201);

    const clinic1Patients = await listPatients(
      new Request("http://localhost:3000/api/v1/patients", { headers: authHeaders("clinic_1") }),
    );
    const clinic1PatientsBody = (await clinic1Patients.json()) as any;
    expect(clinic1Patients.status).toBe(200);
    expect(clinic1PatientsBody.data.items).toHaveLength(1);
    expect(clinic1PatientsBody.data.items[0].clinicId).toBe("clinic_1");

    const clinic2Patients = await listPatients(
      new Request("http://localhost:3000/api/v1/patients", { headers: authHeaders("clinic_2") }),
    );
    const clinic2PatientsBody = (await clinic2Patients.json()) as any;
    expect(clinic2PatientsBody.data.items).toHaveLength(1);
    expect(clinic2PatientsBody.data.items[0].clinicId).toBe("clinic_2");

    const clinic1Appointments = await listAppointments(
      new Request("http://localhost:3000/api/v1/appointments?date=2026-03-20", {
        headers: authHeaders("clinic_1"),
      }),
    );
    const clinic1AppointmentsBody = (await clinic1Appointments.json()) as any;
    expect(clinic1Appointments.status).toBe(200);
    expect(clinic1AppointmentsBody.data).toHaveLength(1);
    expect(clinic1AppointmentsBody.data[0].clinicId).toBe("clinic_1");

    const clinic2Appointments = await listAppointments(
      new Request("http://localhost:3000/api/v1/appointments?date=2026-03-20", {
        headers: authHeaders("clinic_2"),
      }),
    );
    const clinic2AppointmentsBody = (await clinic2Appointments.json()) as any;
    expect(clinic2AppointmentsBody.data).toHaveLength(1);
    expect(clinic2AppointmentsBody.data[0].clinicId).toBe("clinic_2");

    const clinic1Invoices = await listInvoices(
      new Request("http://localhost:3000/api/v1/invoices", { headers: authHeaders("clinic_1") }),
    );
    const clinic1InvoicesBody = (await clinic1Invoices.json()) as any;
    expect(clinic1Invoices.status).toBe(200);
    expect(clinic1InvoicesBody.data.total).toBe(1);
    expect(clinic1InvoicesBody.data.items[0].clinicId).toBe("clinic_1");

    const clinic2Invoices = await listInvoices(
      new Request("http://localhost:3000/api/v1/invoices", { headers: authHeaders("clinic_2") }),
    );
    const clinic2InvoicesBody = (await clinic2Invoices.json()) as any;
    expect(clinic2InvoicesBody.data.total).toBe(1);
    expect(clinic2InvoicesBody.data.items[0].clinicId).toBe("clinic_2");
  });
});

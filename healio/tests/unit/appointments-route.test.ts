import test from "node:test";
import assert from "node:assert/strict";

import { GET, POST } from "@/app/api/v1/appointments/route";
import { resetInternalAppointmentStoreForTests } from "@/services/appointmentService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

test("appointments route POST creates and GET lists appointments for the day", async () => {
  resetInternalAppointmentStoreForTests();

  const postResponse = await POST(
    new Request("http://localhost:3000/api/v1/appointments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        patientId: "patient_1",
        staffId: "staff_1",
        serviceId: "service_1",
        startTime: "2026-03-15T01:00:00.000Z",
        durationMinutes: 30,
        source: "STAFF",
      }),
    }),
  );

  assert.equal(postResponse.status, 201);
  const createdBody = (await postResponse.json()) as any;
  assert.equal(createdBody.success, true);
  assert.equal(createdBody.data.clinicId, "clinic_1");
  assert.equal(createdBody.data.status, "SCHEDULED");

  const getResponse = await GET(
    new Request("http://localhost:3000/api/v1/appointments?date=2026-03-15", {
      headers: authHeaders(),
    }),
  );
  assert.equal(getResponse.status, 200);
  const listBody = (await getResponse.json()) as any;
  assert.equal(listBody.success, true);
  assert.equal(Array.isArray(listBody.data), true);
  assert.equal(listBody.data.length, 1);
  assert.equal(listBody.data[0].id, createdBody.data.id);
});

test("appointments route rejects overlap and unauthenticated requests", async () => {
  resetInternalAppointmentStoreForTests();

  const first = await POST(
    new Request("http://localhost:3000/api/v1/appointments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        patientId: "patient_1",
        staffId: "staff_1",
        serviceId: "service_1",
        startTime: "2026-03-15T02:00:00.000Z",
        durationMinutes: 30,
      }),
    }),
  );
  assert.equal(first.status, 201);

  const overlap = await POST(
    new Request("http://localhost:3000/api/v1/appointments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        patientId: "patient_2",
        staffId: "staff_1",
        serviceId: "service_2",
        startTime: "2026-03-15T02:15:00.000Z",
        durationMinutes: 30,
      }),
    }),
  );
  assert.equal(overlap.status, 409);
  const overlapBody = (await overlap.json()) as any;
  assert.equal(overlapBody.error.code, "OVERLAPPING_APPOINTMENT");

  const unauthenticated = await GET(
    new Request("http://localhost:3000/api/v1/appointments?date=2026-03-15"),
  );
  assert.equal(unauthenticated.status, 401);
});

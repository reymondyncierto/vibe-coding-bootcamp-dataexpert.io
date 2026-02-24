import test from "node:test";
import assert from "node:assert/strict";

import { POST as createAppointmentRoute } from "@/app/api/v1/appointments/route";
import {
  DELETE,
  GET,
  PATCH,
} from "@/app/api/v1/appointments/[id]/route";
import { resetInternalAppointmentStoreForTests } from "@/services/appointmentService";

function authHeaders() {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
  };
}

async function createFixtureAppointment() {
  const response = await createAppointmentRoute(
    new Request("http://localhost:3000/api/v1/appointments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        patientId: "patient_fixture",
        staffId: "staff_fixture",
        serviceId: "service_fixture",
        startTime: "2026-03-20T03:00:00.000Z",
        durationMinutes: 30,
      }),
    }),
  );
  const body = (await response.json()) as any;
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  return body.data.id as string;
}

test("appointment detail route supports get, patch, and delete", async () => {
  resetInternalAppointmentStoreForTests();
  const id = await createFixtureAppointment();

  const detail = await GET(
    new Request(`http://localhost:3000/api/v1/appointments/${id}`, {
      headers: authHeaders(),
    }),
    { params: { id } },
  );
  assert.equal(detail.status, 200);
  const detailBody = (await detail.json()) as any;
  assert.equal(detailBody.success, true);
  assert.equal(detailBody.data.id, id);

  const patch = await PATCH(
    new Request(`http://localhost:3000/api/v1/appointments/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        status: "CANCELLED",
        cancellationReason: "Patient requested reschedule",
      }),
    }),
    { params: { id } },
  );
  assert.equal(patch.status, 200);
  const patchBody = (await patch.json()) as any;
  assert.equal(patchBody.data.status, "CANCELLED");
  assert.equal(patchBody.data.cancellationReason, "Patient requested reschedule");

  const remove = await DELETE(
    new Request(`http://localhost:3000/api/v1/appointments/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
    { params: { id } },
  );
  assert.equal(remove.status, 200);
  const removeBody = (await remove.json()) as any;
  assert.equal(removeBody.data.deleted, true);

  const missingAfterDelete = await GET(
    new Request(`http://localhost:3000/api/v1/appointments/${id}`, {
      headers: authHeaders(),
    }),
    { params: { id } },
  );
  assert.equal(missingAfterDelete.status, 404);
});

test("appointment detail route enforces update rules and auth context", async () => {
  resetInternalAppointmentStoreForTests();
  const id = await createFixtureAppointment();

  const invalidCancel = await PATCH(
    new Request(`http://localhost:3000/api/v1/appointments/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        status: "CANCELLED",
      }),
    }),
    { params: { id } },
  );
  assert.equal(invalidCancel.status, 422);
  const invalidBody = (await invalidCancel.json()) as any;
  assert.equal(invalidBody.error.code, "CANCELLATION_REASON_REQUIRED");

  const unauthenticated = await PATCH(
    new Request(`http://localhost:3000/api/v1/appointments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes: "test" }),
    }),
    { params: { id } },
  );
  assert.equal(unauthenticated.status, 401);
});

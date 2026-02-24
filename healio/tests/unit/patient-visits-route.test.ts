import test from "node:test";
import assert from "node:assert/strict";

import { POST as createPatient } from "@/app/api/v1/patients/route";
import { GET, POST } from "@/app/api/v1/patients/[id]/visits/route";
import { resetInternalPatientStoreForTests } from "@/services/patientService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

async function createFixturePatient() {
  const res = await createPatient(
    new Request("http://localhost:3000/api/v1/patients", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        firstName: "Visit",
        lastName: "Patient",
        phone: "+639170000000",
      }),
    }),
  );
  assert.equal(res.status, 201);
  const body = (await res.json()) as any;
  return body.data.id as string;
}

test.beforeEach(() => {
  resetInternalPatientStoreForTests();
});

test("patient visits route creates notes and append-only amendments, then lists history", async () => {
  const patientId = await createFixturePatient();

  const first = await POST(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}/visits`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        appointmentId: "appt_1",
        subjective: "Patient reports mild headache.",
        plan: "Hydration and rest",
      }),
    }),
    { params: { id: patientId } },
  );
  assert.equal(first.status, 201);
  const firstBody = (await first.json()) as any;
  assert.equal(firstBody.data.amendmentToVisitId, null);

  const amendment = await POST(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}/visits`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        appointmentId: "appt_1",
        subjective: "Amendment: symptoms improved after medication.",
        amendmentToVisitId: firstBody.data.id,
      }),
    }),
    { params: { id: patientId } },
  );
  assert.equal(amendment.status, 201);
  const amendmentBody = (await amendment.json()) as any;
  assert.equal(amendmentBody.data.amendmentToVisitId, firstBody.data.id);

  const list = await GET(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}/visits`, {
      headers: authHeaders(),
    }),
    { params: { id: patientId } },
  );
  assert.equal(list.status, 200);
  const listBody = (await list.json()) as any;
  assert.equal(Array.isArray(listBody.data), true);
  assert.equal(listBody.data.length, 2);
});

test("patient visits route rejects missing patient, invalid amendment target, and missing auth", async () => {
  const unauth = await GET(
    new Request("http://localhost:3000/api/v1/patients/pat_12345/visits"),
    { params: { id: "pat_12345" } },
  );
  assert.equal(unauth.status, 401);

  const missingPatient = await GET(
    new Request("http://localhost:3000/api/v1/patients/pat_missing/visits", {
      headers: authHeaders(),
    }),
    { params: { id: "pat_missing" } },
  );
  assert.equal(missingPatient.status, 404);

  const patientId = await createFixturePatient();
  const invalidAmendment = await POST(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}/visits`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        appointmentId: "appt_2",
        subjective: "Amendment without base note",
        amendmentToVisitId: "visit_missing",
      }),
    }),
    { params: { id: patientId } },
  );
  assert.equal(invalidAmendment.status, 404);
});

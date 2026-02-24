import test from "node:test";
import assert from "node:assert/strict";

import { POST } from "@/app/api/v1/patients/route";
import { GET, PATCH } from "@/app/api/v1/patients/[id]/route";
import { resetInternalPatientStoreForTests } from "@/services/patientService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "DOCTOR",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetInternalPatientStoreForTests();
});

test("patient detail/update route returns and updates decrypted encrypted fields", async () => {
  const created = await POST(
    new Request("http://localhost:3000/api/v1/patients", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        firstName: "Maria",
        lastName: "Santos",
        phone: "+639171111111",
        email: "maria@example.com",
        allergies: "Peanuts",
      }),
    }),
  );
  assert.equal(created.status, 201);
  const createdBody = (await created.json()) as any;
  const patientId = createdBody.data.id as string;

  const detail = await GET(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}`, {
      headers: authHeaders(),
    }),
    { params: { id: patientId } },
  );
  assert.equal(detail.status, 200);
  const detailBody = (await detail.json()) as any;
  assert.equal(detailBody.data.phone, "+639171111111");
  assert.equal(detailBody.data.allergies, "Peanuts");

  const patched = await PATCH(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        phone: "+639188888888",
        chronicConditions: "Asthma",
        notes: "Preferred evening visits",
      }),
    }),
    { params: { id: patientId } },
  );
  assert.equal(patched.status, 200);
  const patchBody = (await patched.json()) as any;
  assert.equal(patchBody.data.phone, "+639188888888");
  assert.equal(patchBody.data.chronicConditions, "Asthma");
  assert.equal(patchBody.data.notes, "Preferred evening visits");
});

test("patient detail/update route rejects invalid id, missing auth, and empty patch", async () => {
  const badId = await GET(
    new Request("http://localhost:3000/api/v1/patients/x", {
      headers: authHeaders(),
    }),
    { params: { id: "x" } },
  );
  assert.equal(badId.status, 400);

  const unauth = await PATCH(
    new Request("http://localhost:3000/api/v1/patients/pat_12345", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes: "Test" }),
    }),
    { params: { id: "pat_12345" } },
  );
  assert.equal(unauth.status, 401);

  const created = await POST(
    new Request("http://localhost:3000/api/v1/patients", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Cruz",
        phone: "+639172222222",
      }),
    }),
  );
  const createdBody = (await created.json()) as any;
  const patientId = createdBody.data.id as string;

  const emptyPatch = await PATCH(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({}),
    }),
    { params: { id: patientId } },
  );
  assert.equal(emptyPatch.status, 400);
});

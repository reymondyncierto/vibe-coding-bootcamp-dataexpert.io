import test from "node:test";
import assert from "node:assert/strict";

import { GET, POST } from "@/app/api/v1/patients/route";
import { resetInternalPatientStoreForTests } from "@/services/patientService";

function authHeaders(overrides?: Record<string, string>) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "RECEPTIONIST",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetInternalPatientStoreForTests();
});

test("patients route POST creates and GET lists/searches/paginates patients", async () => {
  const payloads = [
    { firstName: "Maria", lastName: "Santos", phone: "+639171111111", email: "maria@example.com" },
    { firstName: "John", lastName: "Cruz", phone: "+639172222222", email: "john@example.com" },
    { firstName: "Ava", lastName: "Reyes", phone: "+639173333333", email: "ava@example.com" },
  ];

  for (const payload of payloads) {
    const res = await POST(
      new Request("http://localhost:3000/api/v1/patients", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      }),
    );
    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.clinicId, "clinic_1");
    assert.equal(typeof body.data.phone, "string");
    assert.equal(body.data.phone.startsWith("enc:v1:"), false);
  }

  const page1 = await GET(
    new Request("http://localhost:3000/api/v1/patients?page=1&pageSize=2", {
      headers: authHeaders(),
    }),
  );
  assert.equal(page1.status, 200);
  const page1Body = (await page1.json()) as any;
  assert.equal(page1Body.success, true);
  assert.equal(page1Body.data.items.length, 2);
  assert.equal(page1Body.data.total, 3);
  assert.equal(page1Body.data.totalPages, 2);

  const search = await GET(
    new Request("http://localhost:3000/api/v1/patients?q=maria", {
      headers: authHeaders(),
    }),
  );
  assert.equal(search.status, 200);
  const searchBody = (await search.json()) as any;
  assert.equal(searchBody.success, true);
  assert.equal(searchBody.data.items.length, 1);
  assert.equal(searchBody.data.items[0].fullName, "Maria Santos");
});

test("patients route rejects unauthenticated, invalid query, and clinic mismatch", async () => {
  const unauthenticated = await GET(new Request("http://localhost:3000/api/v1/patients"));
  assert.equal(unauthenticated.status, 401);

  const invalidQuery = await GET(
    new Request("http://localhost:3000/api/v1/patients?page=0", {
      headers: authHeaders(),
    }),
  );
  assert.equal(invalidQuery.status, 400);

  const clinicMismatch = await POST(
    new Request("http://localhost:3000/api/v1/patients", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        clinicId: "other_clinic",
        firstName: "Test",
        lastName: "Mismatch",
        phone: "+639179999999",
      }),
    }),
  );
  assert.equal(clinicMismatch.status, 403);
});

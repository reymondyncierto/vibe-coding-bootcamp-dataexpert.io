import assert from "node:assert/strict";
import test from "node:test";

import { GET as listServices, POST as createService } from "@/app/api/v1/services/route";
import { PATCH as patchService } from "@/app/api/v1/services/[id]/route";
import { resetServiceStoreForTests } from "@/services/serviceService";

function authHeaders(overrides: Record<string, string> = {}) {
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_1",
    "x-healio-role": "OWNER",
    ...overrides,
  };
}

test.beforeEach(() => {
  resetServiceStoreForTests();
});

test("services routes list/create/update-deactivate with tenant isolation", async () => {
  const initial = await listServices(new Request("http://localhost:3000/api/v1/services", { headers: authHeaders() }));
  assert.equal(initial.status, 200);
  const initialBody = await initial.json();
  assert.equal(initialBody.success, true);
  assert.equal(initialBody.data.items.length >= 3, true);

  const created = await createService(new Request("http://localhost:3000/api/v1/services", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "ADMIN" }) },
    body: JSON.stringify({ name: "ECG", durationMinutes: 15, price: "500.00", color: "#EF4444" }),
  }));
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.equal(createdBody.success, true);
  assert.equal(createdBody.data.name, "ECG");
  const serviceId = createdBody.data.id as string;

  const duplicate = await createService(new Request("http://localhost:3000/api/v1/services", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name: "ECG", durationMinutes: 15, price: "500.00", color: "#EF4444" }),
  }));
  assert.equal(duplicate.status, 409);

  const patched = await patchService(new Request(`http://localhost:3000/api/v1/services/${serviceId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ isActive: false, price: "550.00" }),
  }), { params: { id: serviceId } });
  assert.equal(patched.status, 200);
  const patchedBody = await patched.json();
  assert.equal(patchedBody.success, true);
  assert.equal(patchedBody.data.isActive, false);
  assert.equal(patchedBody.data.price, "550.00");

  const activeOnly = await listServices(new Request("http://localhost:3000/api/v1/services", { headers: authHeaders() }));
  const activeOnlyBody = await activeOnly.json();
  assert.equal(activeOnlyBody.data.items.some((item: any) => item.id === serviceId), false);

  const includeInactive = await listServices(new Request("http://localhost:3000/api/v1/services?includeInactive=true", { headers: authHeaders() }));
  const includeInactiveBody = await includeInactive.json();
  assert.equal(includeInactiveBody.data.items.some((item: any) => item.id === serviceId), true);

  const tenantPatch = await patchService(new Request(`http://localhost:3000/api/v1/services/${serviceId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-clinic-id": "clinic_2" }) },
    body: JSON.stringify({ name: "Should Fail" }),
  }), { params: { id: serviceId } });
  assert.equal(tenantPatch.status, 404);
});

test("services routes enforce auth/rbac and validate payloads", async () => {
  const unauthenticated = await listServices(new Request("http://localhost:3000/api/v1/services"));
  assert.equal(unauthenticated.status, 401);

  const forbidden = await createService(new Request("http://localhost:3000/api/v1/services", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders({ "x-healio-role": "FRONT_DESK" }) },
    body: JSON.stringify({ name: "ECG", durationMinutes: 15, price: "500.00", color: "#EF4444" }),
  }));
  assert.equal(forbidden.status, 403);

  const invalid = await createService(new Request("http://localhost:3000/api/v1/services", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name: "", durationMinutes: 1, price: "bad" }),
  }));
  assert.equal(invalid.status, 400);
});

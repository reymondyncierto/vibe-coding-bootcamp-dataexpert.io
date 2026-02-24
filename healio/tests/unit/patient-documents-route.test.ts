import test from "node:test";
import assert from "node:assert/strict";

import { POST as createPatient } from "@/app/api/v1/patients/route";
import {
  GET,
  POST,
} from "@/app/api/v1/patients/[id]/documents/route";
import { resetDocumentStoresForTests } from "@/services/documentService";
import { resetInternalPatientStoreForTests } from "@/services/patientService";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

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
        firstName: "Doc",
        lastName: "Patient",
        phone: "+639199999999",
      }),
    }),
  );
  assert.equal(res.status, 201);
  const body = (await res.json()) as any;
  return body.data.id as string;
}

function makeUploadRequest(url: string, file: File, headers?: Record<string, string>) {
  const form = new FormData();
  form.set("file", file);
  return new Request(url, {
    method: "POST",
    headers: headers ?? authHeaders(),
    body: form,
  });
}

test.beforeEach(() => {
  resetInternalPatientStoreForTests();
  resetDocumentStoresForTests();
});

test("patient documents route uploads and lists documents with signed preview urls", async () => {
  const patientId = await createFixturePatient();

  const upload = await POST(
    makeUploadRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/documents`,
      new File([PDF_BYTES], "Lab Result Final.pdf", { type: "application/pdf" }),
    ),
    { params: { id: patientId } },
  );
  assert.equal(upload.status, 201);
  const uploadBody = (await upload.json()) as any;
  assert.equal(uploadBody.success, true);
  assert.equal(uploadBody.data.patientId, patientId);
  assert.equal(uploadBody.data.mimeType, "application/pdf");
  assert.equal(uploadBody.data.downloadUrl.startsWith("memory://signed/"), true);
  assert.equal(uploadBody.data.downloadUrlExpiresInSeconds, 900);

  const secondUpload = await POST(
    makeUploadRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/documents`,
      new File([PNG_BYTES], "scan.png", { type: "image/png" }),
    ),
    { params: { id: patientId } },
  );
  assert.equal(secondUpload.status, 201);

  const list = await GET(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}/documents`, {
      headers: authHeaders(),
    }),
    { params: { id: patientId } },
  );
  assert.equal(list.status, 200);
  const listBody = (await list.json()) as any;
  assert.equal(listBody.success, true);
  assert.equal(Array.isArray(listBody.data), true);
  assert.equal(listBody.data.length, 2);
  assert.equal(listBody.data[0].downloadUrl.startsWith("memory://signed/"), true);
  assert.equal(listBody.data[0].patientId, patientId);
});

test("patient documents route rejects unauthenticated, invalid patient, missing file, and invalid mime", async () => {
  const unauth = await GET(
    new Request("http://localhost:3000/api/v1/patients/pat_1234/documents"),
    { params: { id: "pat_1234" } },
  );
  assert.equal(unauth.status, 401);

  const badId = await POST(
    makeUploadRequest(
      "http://localhost:3000/api/v1/patients/x/documents",
      new File([PDF_BYTES], "ok.pdf", { type: "application/pdf" }),
    ),
    { params: { id: "x" } },
  );
  assert.equal(badId.status, 400);

  const patientId = await createFixturePatient();

  const noFileForm = new FormData();
  noFileForm.set("note", "not a file");
  const noFile = await POST(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}/documents`, {
      method: "POST",
      headers: authHeaders(),
      body: noFileForm,
    }),
    { params: { id: patientId } },
  );
  assert.equal(noFile.status, 400);

  const invalidMime = await POST(
    makeUploadRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/documents`,
      new File([PDF_BYTES], "dicom.dcm", { type: "application/dicom" }),
    ),
    { params: { id: patientId } },
  );
  assert.equal(invalidMime.status, 415);
});

test("patient documents route enforces tenant-scoped patient lookup", async () => {
  const patientId = await createFixturePatient();

  const wrongClinicList = await GET(
    new Request(`http://localhost:3000/api/v1/patients/${patientId}/documents`, {
      headers: authHeaders({ "x-healio-clinic-id": "clinic_2" }),
    }),
    { params: { id: patientId } },
  );
  assert.equal(wrongClinicList.status, 404);

  const wrongClinicUpload = await POST(
    makeUploadRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/documents`,
      new File([PDF_BYTES], "ok.pdf", { type: "application/pdf" }),
      authHeaders({ "x-healio-clinic-id": "clinic_2" }),
    ),
    { params: { id: patientId } },
  );
  assert.equal(wrongClinicUpload.status, 404);
});

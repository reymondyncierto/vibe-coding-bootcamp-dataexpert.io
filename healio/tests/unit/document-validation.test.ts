import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPrivateDocumentObjectPath,
  createSignedPatientDocumentUrl,
  resetDocumentStoresForTests,
  uploadPatientDocumentForClinic,
  validateDocumentUpload,
} from "@/services/documentService";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00]);

test.beforeEach(() => {
  resetDocumentStoresForTests();
});

test("validateDocumentUpload accepts allowed mime types with matching magic bytes and sanitizes filenames", () => {
  const pdf = validateDocumentUpload({
    filename: "Lab Result (Final)!.PDF",
    mimeType: "application/pdf",
    sizeBytes: PDF_BYTES.byteLength,
    bytes: PDF_BYTES,
  });
  assert.equal(pdf.ok, true);
  if (pdf.ok) {
    assert.equal(pdf.mimeType, "application/pdf");
    assert.equal(pdf.fileExtension, "pdf");
    assert.equal(pdf.safeFilenameBase, "lab-result-final");
  }

  const png = validateDocumentUpload({
    filename: "scan.png",
    mimeType: "image/png",
    sizeBytes: PNG_BYTES.byteLength,
    bytes: PNG_BYTES,
  });
  assert.equal(png.ok, true);

  const jpeg = validateDocumentUpload({
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    sizeBytes: JPEG_BYTES.byteLength,
    bytes: JPEG_BYTES,
  });
  assert.equal(jpeg.ok, true);
});

test("validateDocumentUpload rejects unsupported mime, oversized files, and magic-byte mismatch", () => {
  const unsupported = validateDocumentUpload({
    filename: "ct-scan.dcm",
    mimeType: "application/dicom",
    sizeBytes: 16,
    bytes: new Uint8Array([0x00, 0x01, 0x02]),
  });
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) assert.equal(unsupported.code, "UNSUPPORTED_MIME_TYPE");

  const tooLarge = validateDocumentUpload({
    filename: "big.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10 * 1024 * 1024 + 1,
    bytes: PDF_BYTES,
  });
  assert.equal(tooLarge.ok, false);
  if (!tooLarge.ok) assert.equal(tooLarge.code, "FILE_TOO_LARGE");

  const mismatch = validateDocumentUpload({
    filename: "fake.pdf",
    mimeType: "application/pdf",
    sizeBytes: PNG_BYTES.byteLength,
    bytes: PNG_BYTES,
  });
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.code, "MIME_SIGNATURE_MISMATCH");
});

test("document service builds private object paths and signs private URLs (in-memory fallback)", async () => {
  const path = buildPrivateDocumentObjectPath({
    clinicId: "clinic_1",
    patientId: "pat_1",
    safeFilenameBase: "lab-result",
    fileExtension: "pdf",
  });
  assert.equal(path.startsWith("clinic_1/pat_1/"), true);
  assert.equal(path.endsWith("-lab-result.pdf"), true);

  const uploaded = await uploadPatientDocumentForClinic({
    clinicId: "clinic_1",
    patientId: "pat_1",
    staffId: "staff_1",
    filename: "Lab Result.pdf",
    mimeType: "application/pdf",
    bytes: PDF_BYTES,
  });
  assert.equal(uploaded.ok, true);
  if (!uploaded.ok) return;

  const signed = await createSignedPatientDocumentUrl({
    clinicId: "clinic_1",
    patientId: "pat_1",
    documentId: uploaded.data.id,
  });
  assert.equal(signed.ok, true);
  if (signed.ok) {
    assert.equal(signed.data.signedUrl.startsWith("memory://signed/"), true);
    assert.equal(signed.data.expiresInSeconds, 3600);
  }
});

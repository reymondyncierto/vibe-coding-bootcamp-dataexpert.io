import crypto from "node:crypto";

import { sanitizeFilenameSegment } from "@/lib/utils";

export const MAX_DOCUMENT_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export type DocumentValidationInput = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
};

export type DocumentValidationResult =
  | {
      ok: true;
      mimeType: AllowedDocumentMimeType;
      safeFilenameBase: string;
      fileExtension: string;
      sizeBytes: number;
    }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

export type PatientDocumentRecord = {
  id: string;
  clinicId: string;
  patientId: string;
  staffId: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: AllowedDocumentMimeType;
  sizeBytes: number;
  objectPath: string;
  uploadedAt: string;
};

export type DocumentServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

type DocumentStorageAdapter = {
  uploadPrivateObject(input: {
    bucket: string;
    objectPath: string;
    bytes: Uint8Array;
    mimeType: string;
  }): Promise<void>;
  createSignedDownloadUrl(input: {
    bucket: string;
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<string>;
};

const PRIVATE_DOCUMENT_BUCKET = "patient-documents";

type InMemoryDocumentBlobStore = Map<string, { bytes: Uint8Array; mimeType: string }>;

function getDocumentMetadataStore() {
  const globalScope = globalThis as typeof globalThis & {
    __healioDocumentMetadataStore?: PatientDocumentRecord[];
  };
  if (!globalScope.__healioDocumentMetadataStore) {
    globalScope.__healioDocumentMetadataStore = [];
  }
  return globalScope.__healioDocumentMetadataStore;
}

function getInMemoryBlobStore(): InMemoryDocumentBlobStore {
  const globalScope = globalThis as typeof globalThis & {
    __healioDocumentBlobStore?: InMemoryDocumentBlobStore;
  };
  if (!globalScope.__healioDocumentBlobStore) {
    globalScope.__healioDocumentBlobStore = new Map();
  }
  return globalScope.__healioDocumentBlobStore;
}

function extensionFromMime(mimeType: AllowedDocumentMimeType) {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
  }
}

function sniffMimeTypeFromMagicBytes(bytes: Uint8Array): AllowedDocumentMimeType | null {
  if (bytes.length >= 5) {
    const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d];
    if (pdf.every((value, index) => bytes[index] === value)) return "application/pdf";
  }
  if (bytes.length >= 3) {
    const jpeg = [0xff, 0xd8, 0xff];
    if (jpeg.every((value, index) => bytes[index] === value)) return "image/jpeg";
  }
  if (bytes.length >= 8) {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((value, index) => bytes[index] === value)) return "image/png";
  }
  return null;
}

export function validateDocumentUpload(input: DocumentValidationInput): DocumentValidationResult {
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, code: "INVALID_FILE_SIZE", message: "File size must be a positive integer.", status: 400 };
  }
  if (input.sizeBytes > MAX_DOCUMENT_FILE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "File exceeds the 10MB upload limit.",
      status: 413,
    };
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(input.mimeType as AllowedDocumentMimeType)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MIME_TYPE",
      message: "Unsupported document type. Allowed types are PDF, JPEG, and PNG.",
      status: 415,
    };
  }

  const sniffed = sniffMimeTypeFromMagicBytes(input.bytes);
  if (!sniffed) {
    return {
      ok: false,
      code: "INVALID_FILE_SIGNATURE",
      message: "Unable to verify file signature.",
      status: 400,
    };
  }
  if (sniffed !== input.mimeType) {
    return {
      ok: false,
      code: "MIME_SIGNATURE_MISMATCH",
      message: "File contents do not match the declared MIME type.",
      status: 400,
      details: { declaredMimeType: input.mimeType, sniffedMimeType: sniffed },
    };
  }

  const originalBase = input.filename.replace(/\.[^.]+$/, "");
  const safeFilenameBase = sanitizeFilenameSegment(originalBase) || "document";

  return {
    ok: true,
    mimeType: sniffed,
    safeFilenameBase,
    fileExtension: extensionFromMime(sniffed),
    sizeBytes: input.sizeBytes,
  };
}

export function buildPrivateDocumentObjectPath(input: {
  clinicId: string;
  patientId: string;
  safeFilenameBase: string;
  fileExtension: string;
}) {
  const clinic = sanitizeFilenameSegment(input.clinicId) || "clinic";
  const patient = sanitizeFilenameSegment(input.patientId) || "patient";
  const basename = sanitizeFilenameSegment(input.safeFilenameBase) || "document";
  const uuid = crypto.randomUUID();
  return `${clinic}/${patient}/${uuid}-${basename}.${input.fileExtension}`;
}

function createInMemoryStorageAdapter(): DocumentStorageAdapter {
  return {
    async uploadPrivateObject(input) {
      getInMemoryBlobStore().set(`${input.bucket}/${input.objectPath}`, {
        bytes: input.bytes,
        mimeType: input.mimeType,
      });
    },
    async createSignedDownloadUrl(input) {
      const token = crypto.randomUUID();
      return `memory://signed/${input.bucket}/${input.objectPath}?token=${token}&expiresIn=${input.expiresInSeconds}`;
    },
  };
}

async function createSupabaseStorageAdapter(): Promise<DocumentStorageAdapter | null> {
  try {
    const mod = await import("@/lib/supabase/server");
    const supabase = mod.createSupabaseServiceRoleClient();
    return {
      async uploadPrivateObject(input) {
        const { error } = await supabase.storage
          .from(input.bucket)
          .upload(input.objectPath, input.bytes, {
            contentType: input.mimeType,
            upsert: false,
          });
        if (error) throw error;
      },
      async createSignedDownloadUrl(input) {
        const { data, error } = await supabase.storage
          .from(input.bucket)
          .createSignedUrl(input.objectPath, input.expiresInSeconds);
        if (error || !data?.signedUrl) {
          throw error ?? new Error("Failed to create signed URL.");
        }
        return data.signedUrl;
      },
    };
  } catch {
    return null;
  }
}

async function getDocumentStorageAdapter() {
  return (await createSupabaseStorageAdapter()) ?? createInMemoryStorageAdapter();
}

export async function uploadPatientDocumentForClinic(input: {
  clinicId: string;
  patientId: string;
  staffId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<DocumentServiceResult<PatientDocumentRecord>> {
  const validation = validateDocumentUpload({
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    bytes: input.bytes,
  });
  if (!validation.ok) return validation;

  const objectPath = buildPrivateDocumentObjectPath({
    clinicId: input.clinicId,
    patientId: input.patientId,
    safeFilenameBase: validation.safeFilenameBase,
    fileExtension: validation.fileExtension,
  });

  const adapter = await getDocumentStorageAdapter();
  await adapter.uploadPrivateObject({
    bucket: PRIVATE_DOCUMENT_BUCKET,
    objectPath,
    bytes: input.bytes,
    mimeType: validation.mimeType,
  });

  const uploadedAt = new Date().toISOString();
  const record: PatientDocumentRecord = {
    id: `doc_${crypto.randomUUID()}`,
    clinicId: input.clinicId,
    patientId: input.patientId,
    staffId: input.staffId,
    originalFilename: input.filename,
    sanitizedFilename: `${validation.safeFilenameBase}.${validation.fileExtension}`,
    mimeType: validation.mimeType,
    sizeBytes: validation.sizeBytes,
    objectPath,
    uploadedAt,
  };
  getDocumentMetadataStore().push(record);
  return { ok: true, data: record };
}

export async function listPatientDocumentsForClinic(input: {
  clinicId: string;
  patientId: string;
}) {
  return getDocumentMetadataStore()
    .filter((item) => item.clinicId === input.clinicId && item.patientId === input.patientId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map((item) => ({ ...item }));
}

export async function createSignedPatientDocumentUrl(input: {
  clinicId: string;
  patientId: string;
  documentId: string;
  expiresInSeconds?: number;
}): Promise<DocumentServiceResult<{ signedUrl: string; expiresInSeconds: number }>> {
  const record = getDocumentMetadataStore().find(
    (item) =>
      item.id === input.documentId &&
      item.clinicId === input.clinicId &&
      item.patientId === input.patientId,
  );
  if (!record) {
    return { ok: false, code: "DOCUMENT_NOT_FOUND", message: "Document not found.", status: 404 };
  }

  const expiresInSeconds = Math.max(60, Math.min(3600, input.expiresInSeconds ?? 3600));
  const adapter = await getDocumentStorageAdapter();
  const signedUrl = await adapter.createSignedDownloadUrl({
    bucket: PRIVATE_DOCUMENT_BUCKET,
    objectPath: record.objectPath,
    expiresInSeconds,
  });
  return { ok: true, data: { signedUrl, expiresInSeconds } };
}

export function resetDocumentStoresForTests() {
  getDocumentMetadataStore().length = 0;
  getInMemoryBlobStore().clear();
}

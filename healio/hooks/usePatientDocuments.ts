"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

export type PatientDocumentListItem = {
  id: string;
  clinicId: string;
  patientId: string;
  staffId: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | string;
  sizeBytes: number;
  objectPath: string;
  uploadedAt: string;
  downloadUrl: string;
  downloadUrlExpiresInSeconds: number;
};

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class PatientDocumentsApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(input: { status: number; code: string; message: string; details?: unknown }) {
    super(input.message);
    this.name = "PatientDocumentsApiError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      if (!headers.has("x-healio-clinic-id")) headers.set("x-healio-clinic-id", "clinic_1");
      if (!headers.has("x-healio-user-id")) headers.set("x-healio-user-id", "ui_dev_user");
      if (!headers.has("x-healio-role")) headers.set("x-healio-role", "RECEPTIONIST");
    }
  }

  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers,
  });

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to generic error
  }

  if (!response.ok || !json || !json.success) {
    const error =
      json && !json.success
        ? json.error
        : { code: "REQUEST_FAILED", message: "Request failed." };

    throw new PatientDocumentsApiError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  return json.data;
}

export function usePatientDocuments(
  patientId: string | null,
  options?: Omit<
    UseQueryOptions<PatientDocumentListItem[], PatientDocumentsApiError, PatientDocumentListItem[]>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: queryKeys.patientDocuments.list(patientId ?? "unknown"),
    enabled: Boolean(patientId),
    queryFn: () => requestJson<PatientDocumentListItem[]>(`/api/v1/patients/${patientId}/documents`),
    ...options,
  });
}

export function useUploadPatientDocument(
  patientId: string,
  options?: UseMutationOptions<PatientDocumentListItem, PatientDocumentsApiError, File>,
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;

  return useMutation({
    ...options,
    mutationFn: (file) => {
      const formData = new FormData();
      formData.set("file", file);
      return requestJson<PatientDocumentListItem>(`/api/v1/patients/${patientId}/documents`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.patientDocuments.list(patientId),
      });
      await userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import type { VisitNoteCreateInput, VisitNoteSummary } from "@/schemas/patient";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class PatientVisitsApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(input: { status: number; code: string; message: string; details?: unknown }) {
    super(input.message);
    this.name = "PatientVisitsApiError";
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
      if (!headers.has("x-healio-role")) headers.set("x-healio-role", "DOCTOR");
    }
  }

  const response = await fetch(input, { cache: "no-store", ...init, headers });

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through
  }

  if (!response.ok || !json || !json.success) {
    const error =
      json && !json.success
        ? json.error
        : { code: "REQUEST_FAILED", message: "Request failed." };
    throw new PatientVisitsApiError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  return json.data;
}

export function usePatientVisitNotes(
  patientId: string | null,
  options?: Omit<
    UseQueryOptions<VisitNoteSummary[], PatientVisitsApiError, VisitNoteSummary[]>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: queryKeys.patientVisits.list(patientId ?? "unknown"),
    enabled: Boolean(patientId),
    queryFn: () => requestJson<VisitNoteSummary[]>(`/api/v1/patients/${patientId}/visits`),
    ...options,
  });
}

type CreateVisitNotePayload = VisitNoteCreateInput;

export function useCreatePatientVisitNote(
  patientId: string,
  options?: UseMutationOptions<VisitNoteSummary, PatientVisitsApiError, CreateVisitNotePayload>,
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;

  return useMutation({
    ...options,
    mutationFn: (payload) =>
      requestJson<VisitNoteSummary>(`/api/v1/patients/${patientId}/visits`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.patientVisits.list(patientId),
      });
      await userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

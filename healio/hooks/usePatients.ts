"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { patientsListSearchParams, queryKeys } from "@/lib/query-keys";
import type { PatientDetail, PatientListResponse } from "@/schemas/patient";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class PatientsApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(input: { status: number; code: string; message: string; details?: unknown }) {
    super(input.message);
    this.name = "PatientsApiRequestError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  // Local-only fallback so UI tasks can exercise protected APIs before the auth flow is implemented.
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

    throw new PatientsApiRequestError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  return json.data;
}

export type PatientsListQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
};

function normalizeListParams(params: PatientsListQuery) {
  return {
    q: params.q?.trim() ? params.q.trim() : undefined,
    page: Math.max(1, params.page ?? 1),
    pageSize: Math.min(100, Math.max(1, params.pageSize ?? 20)),
  };
}

export function usePatientsList(
  params: PatientsListQuery,
  options?: Omit<
    UseQueryOptions<PatientListResponse, PatientsApiRequestError, PatientListResponse>,
    "queryKey" | "queryFn"
  >,
) {
  const normalized = normalizeListParams(params);

  return useQuery({
    queryKey: queryKeys.patients.list(normalized),
    queryFn: () =>
      requestJson<PatientListResponse>(
        `/api/v1/patients?${patientsListSearchParams(normalized).toString()}`,
      ),
    placeholderData: (previous) => previous,
    ...options,
  });
}

export function usePatientDetail(
  id: string | null,
  options?: Omit<
    UseQueryOptions<PatientDetail, PatientsApiRequestError, PatientDetail>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id ?? "unknown"),
    enabled: Boolean(id),
    queryFn: () => requestJson<PatientDetail>(`/api/v1/patients/${id}`),
    ...options,
  });
}

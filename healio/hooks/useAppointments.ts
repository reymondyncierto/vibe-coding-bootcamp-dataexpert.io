"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { appointmentsListSearchParams, queryKeys } from "@/lib/query-keys";
import type {
  AppointmentCreateInput,
  AppointmentSummary,
  AppointmentUpdateInput,
  AppointmentsListQuery,
} from "@/schemas/appointment";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(input: { status: number; code: string; message: string; details?: unknown }) {
    super(input.message);
    this.name = "ApiRequestError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // ignore and fall through to generic error
  }

  if (!response.ok || !json || !json.success) {
    const error =
      json && !json.success
        ? json.error
        : { code: "REQUEST_FAILED", message: "Request failed." };
    throw new ApiRequestError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  return json.data;
}

export function useAppointmentsList(
  params: AppointmentsListQuery,
  options?: Omit<
    UseQueryOptions<AppointmentSummary[], ApiRequestError, AppointmentSummary[]>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: queryKeys.appointments.list(params),
    queryFn: () =>
      requestJson<AppointmentSummary[]>(
        `/api/v1/appointments?${appointmentsListSearchParams(params).toString()}`,
      ),
    ...options,
  });
}

export function useAppointmentDetail(
  id: string | null,
  options?: Omit<
    UseQueryOptions<AppointmentSummary, ApiRequestError, AppointmentSummary>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id ?? "unknown"),
    enabled: Boolean(id),
    queryFn: () => requestJson<AppointmentSummary>(`/api/v1/appointments/${id}`),
    ...options,
  });
}

type CreateAppointmentPayload = Omit<AppointmentCreateInput, "clinicId"> & {
  clinicId?: string;
};

export function useCreateAppointment(
  options?: UseMutationOptions<AppointmentSummary, ApiRequestError, CreateAppointmentPayload>,
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;

  return useMutation({
    ...options,
    mutationFn: (payload) =>
      requestJson<AppointmentSummary>("/api/v1/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async (data, variables, onMutateResult, context) => {
      const date = data.startTime.slice(0, 10);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.list({ date }),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.detail(data.id),
        }),
      ]);
      await userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useUpdateAppointment(
  options?: UseMutationOptions<
    AppointmentSummary,
    ApiRequestError,
    { id: string; patch: AppointmentUpdateInput }
  >,
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;

  return useMutation({
    ...options,
    mutationFn: ({ id, patch }) =>
      requestJson<AppointmentSummary>(`/api/v1/appointments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: async (data, variables, onMutateResult, context) => {
      const date = data.startTime.slice(0, 10);
      queryClient.setQueryData(queryKeys.appointments.detail(data.id), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list({ date }) }),
      ]);
      await userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useDeleteAppointment(
  options?: UseMutationOptions<
    { id: string; deleted: true },
    ApiRequestError,
    { id: string; date?: string }
  >,
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;

  return useMutation({
    ...options,
    mutationFn: ({ id }) =>
      requestJson<{ id: string; deleted: true }>(`/api/v1/appointments/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async (data, variables, onMutateResult, context) => {
      queryClient.removeQueries({ queryKey: queryKeys.appointments.detail(data.id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.lists() }),
        ...(variables.date
          ? [
              queryClient.invalidateQueries({
                queryKey: queryKeys.appointments.list({ date: variables.date }),
              }),
            ]
          : []),
      ]);
      await userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

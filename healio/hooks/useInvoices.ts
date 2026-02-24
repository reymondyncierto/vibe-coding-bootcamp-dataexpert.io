"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" | "REFUNDED";
export type CurrencyCode = "PHP" | "USD";

export type InvoiceSummary = {
  id: string;
  clinicId: string;
  patientId: string;
  appointmentId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: CurrencyCode;
  subtotal: string;
  tax: string;
  total: string;
  paidAmount: string;
  paymentMethod: string | null;
  dueDate: string;
  paidAt: string | null;
  sentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceDetail = InvoiceSummary & {
  items: InvoiceLineItem[];
  stripePaymentIntentId: string | null;
  stripeCheckoutUrl: string | null;
  deletedAt: string | null;
};

export type InvoiceListResponse = {
  items: InvoiceSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type InvoiceCreatePayload = {
  patientId: string;
  appointmentId?: string;
  dueDate: string;
  currency: CurrencyCode;
  items: Array<{ description: string; quantity: number; unitPrice: string }>;
  taxAmount?: string;
  taxRatePercent?: number;
  notes?: string;
};

export type InvoiceUpdatePayload = {
  dueDate?: string;
  currency?: CurrencyCode;
  items?: Array<{ description: string; quantity: number; unitPrice: string }>;
  taxAmount?: string;
  taxRatePercent?: number;
  notes?: string;
  status?: InvoiceStatus;
  paidAmount?: string;
  paymentMethod?: "CASH" | "CARD" | "BANK_TRANSFER" | "GCASH" | "MAYA" | "STRIPE" | null;
};

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class InvoicesApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(input: { status: number; code: string; message: string; details?: unknown }) {
    super(input.message);
    this.name = "InvoicesApiError";
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

  const response = await fetch(input, { cache: "no-store", ...init, headers });
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through
  }

  if (!response.ok || !json || !json.success) {
    const error = json && !json.success ? json.error : { code: "REQUEST_FAILED", message: "Request failed." };
    throw new InvoicesApiError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
  return json.data;
}

export type InvoicesListParams = {
  status?: InvoiceStatus | "ALL";
  page?: number;
  pageSize?: number;
};

function buildSearchParams(params: InvoicesListParams) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "ALL") search.set("status", params.status);
  search.set("page", String(Math.max(1, params.page ?? 1)));
  search.set("pageSize", String(Math.min(100, Math.max(1, params.pageSize ?? 20))));
  return search;
}

function invoicesQueryKey(params: { status: InvoiceStatus | "ALL"; page: number; pageSize: number }) {
  return ["invoices", "list", params] as const;
}

export function useInvoicesList(
  params: InvoicesListParams,
  options?: Omit<UseQueryOptions<InvoiceListResponse, InvoicesApiError>, "queryKey" | "queryFn">,
) {
  const normalized = {
    status: params.status ?? "ALL",
    page: Math.max(1, params.page ?? 1),
    pageSize: Math.min(100, Math.max(1, params.pageSize ?? 20)),
  } as const;

  return useQuery({
    queryKey: invoicesQueryKey(normalized),
    queryFn: () => requestJson<InvoiceListResponse>(`/api/v1/invoices?${buildSearchParams(normalized).toString()}`),
    placeholderData: (previous) => previous,
    ...options,
  });
}

export function useInvoiceDetail(
  invoiceId: string | null,
  options?: Omit<UseQueryOptions<InvoiceDetail, InvoicesApiError>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery({
    queryKey: ["invoices", "detail", invoiceId ?? "unknown"],
    enabled: Boolean(invoiceId),
    queryFn: () => requestJson<InvoiceDetail>(`/api/v1/invoices/${invoiceId}`),
    ...options,
  });
}

function invalidateInvoiceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["invoices", "list"] }),
    queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] }),
  ]);
}

export function useCreateInvoice(
  options?: UseMutationOptions<InvoiceDetail, InvoicesApiError, InvoiceCreatePayload>,
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;

  return useMutation({
    ...options,
    mutationFn: (payload) =>
      requestJson<InvoiceDetail>("/api/v1/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateInvoiceQueries(queryClient);
      await userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useUpdateInvoice(
  invoiceId: string | null,
  options?: UseMutationOptions<InvoiceDetail, InvoicesApiError, InvoiceUpdatePayload>,
) {
  const queryClient = useQueryClient();
  const userOnSuccess = options?.onSuccess;

  return useMutation({
    ...options,
    mutationFn: (payload) => {
      if (!invoiceId) throw new InvoicesApiError({ status: 400, code: "INVOICE_ID_REQUIRED", message: "invoiceId is required" });
      return requestJson<InvoiceDetail>(`/api/v1/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateInvoiceQueries(queryClient);
      await userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

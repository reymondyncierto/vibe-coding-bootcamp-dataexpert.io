export const queryKeys = {
  appointments: {
    all: ["appointments"] as const,
    lists: () => [...queryKeys.appointments.all, "list"] as const,
    list: (params: { date: string; staffId?: string; status?: string }) =>
      [...queryKeys.appointments.lists(), params] as const,
    details: () => [...queryKeys.appointments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.appointments.details(), id] as const,
  },
  patients: {
    all: ["patients"] as const,
    lists: () => [...queryKeys.patients.all, "list"] as const,
    list: (params: { q?: string; page: number; pageSize: number }) =>
      [...queryKeys.patients.lists(), params] as const,
    details: () => [...queryKeys.patients.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.patients.details(), id] as const,
  },
  patientVisits: {
    all: ["patientVisits"] as const,
    lists: () => [...queryKeys.patientVisits.all, "list"] as const,
    list: (patientId: string) => [...queryKeys.patientVisits.lists(), patientId] as const,
  },
  patientDocuments: {
    all: ["patientDocuments"] as const,
    lists: () => [...queryKeys.patientDocuments.all, "list"] as const,
    list: (patientId: string) => [...queryKeys.patientDocuments.lists(), patientId] as const,
  },
};

export function appointmentsListSearchParams(params: {
  date: string;
  staffId?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  search.set("date", params.date);
  if (params.staffId) search.set("staffId", params.staffId);
  if (params.status) search.set("status", params.status);
  return search;
}

export function patientsListSearchParams(params: {
  q?: string;
  page: number;
  pageSize: number;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));
  return search;
}

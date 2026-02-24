export const queryKeys = {
  appointments: {
    all: ["appointments"] as const,
    lists: () => [...queryKeys.appointments.all, "list"] as const,
    list: (params: { date: string; staffId?: string; status?: string }) =>
      [...queryKeys.appointments.lists(), params] as const,
    details: () => [...queryKeys.appointments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.appointments.details(), id] as const,
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

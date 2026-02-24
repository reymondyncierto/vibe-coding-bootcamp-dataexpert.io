import { getOrSetInMemoryCache, invalidateInMemoryCacheByPrefix } from "@/lib/cache";
import type { InvoiceDetail } from "@/schemas/invoice";
import type { AppointmentSummary } from "@/schemas/appointment";
import { listPatientsForClinic } from "@/services/patientService";
import { listServicesForClinic } from "@/services/serviceService";
import { moneyToCents } from "@/lib/utils";

type InternalAppointmentAnalyticsRecord = AppointmentSummary & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type AppointmentStores = {
  internalAppointmentStore: InternalAppointmentAnalyticsRecord[];
  publicBookingAppointmentStore: Array<{
    clinicSlug: string;
    serviceId: string;
    serviceName: string;
    slotStartTime: string;
    slotEndTime: string;
    status: string;
    createdAt: string;
  }>;
};

type InvoiceAnalyticsRecord = InvoiceDetail;

export type AnalyticsTrendPoint = {
  date: string;
  appointmentsCount: number;
  completedAppointments: number;
  noShows: number;
  billedCents: number;
  collectedCents: number;
};

export type AnalyticsServiceBreakdownItem = {
  serviceId: string;
  serviceName: string;
  appointmentsCount: number;
  completedAppointments: number;
  noShows: number;
  billedCents: number;
  collectedCents: number;
};

export type AnalyticsDashboard = {
  clinicId: string;
  range: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    appointmentsTotal: number;
    completedAppointments: number;
    noShows: number;
    cancellationRatePercent: number;
    invoicesTotal: number;
    paidInvoices: number;
    overdueInvoices: number;
    totalBilledCents: number;
    totalCollectedCents: number;
    outstandingCents: number;
    collectionRatePercent: number;
    uniquePatientsSeen: number;
  };
  trends: AnalyticsTrendPoint[];
  serviceBreakdown: AnalyticsServiceBreakdownItem[];
  generatedAt: string;
  cache: {
    key: string;
    hit: boolean;
    ttlMs: number;
    expiresAt: string;
  };
};

export type AnalyticsServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

const DEFAULT_RANGE_DAYS = 14;
const MIN_RANGE_DAYS = 1;
const MAX_RANGE_DAYS = 90;
const ANALYTICS_CACHE_TTL_MS = 30_000;

function readInvoiceStore(): InvoiceAnalyticsRecord[] {
  const globalScope = globalThis as typeof globalThis & {
    __healioInvoiceStore?: InvoiceAnalyticsRecord[];
  };
  return globalScope.__healioInvoiceStore ?? [];
}

function readAppointmentStores(): AppointmentStores {
  const globalScope = globalThis as typeof globalThis & {
    __healioAppointmentServiceStores?: AppointmentStores;
  };
  return (
    globalScope.__healioAppointmentServiceStores ?? {
      internalAppointmentStore: [],
      publicBookingAppointmentStore: [],
    }
  );
}

function toUtcMidnight(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatUtcDateFromMs(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function normalizeRangeDays(days?: number) {
  if (days === undefined) return DEFAULT_RANGE_DAYS;
  if (!Number.isInteger(days) || days < MIN_RANGE_DAYS || days > MAX_RANGE_DAYS) {
    throw new Error(`days must be an integer between ${MIN_RANGE_DAYS} and ${MAX_RANGE_DAYS}.`);
  }
  return days;
}

function isActiveInvoiceStatus(status: string) {
  return status !== "VOID" && status !== "REFUNDED";
}

function createTrendBuckets(startMs: number, days: number) {
  const buckets = new Map<string, AnalyticsTrendPoint>();
  for (let i = 0; i < days; i += 1) {
    const date = formatUtcDateFromMs(startMs + i * 86_400_000);
    buckets.set(date, {
      date,
      appointmentsCount: 0,
      completedAppointments: 0,
      noShows: 0,
      billedCents: 0,
      collectedCents: 0,
    });
  }
  return buckets;
}

async function buildAnalyticsDashboard(input: {
  clinicId: string;
  days: number;
  now: Date;
}): Promise<AnalyticsDashboard> {
  const rangeEndMs = toUtcMidnight(input.now) + 86_400_000;
  const rangeStartMs = rangeEndMs - input.days * 86_400_000;
  const trendBuckets = createTrendBuckets(rangeStartMs, input.days);
  const services = listServicesForClinic({ clinicId: input.clinicId, includeInactive: true });
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));
  const serviceBreakdownMap = new Map<string, AnalyticsServiceBreakdownItem>();

  const appointmentStores = readAppointmentStores();
  const internalAppointments = appointmentStores.internalAppointmentStore.filter(
    (item) => item.deletedAt === null && item.clinicId === input.clinicId,
  );

  const appointmentsInRange = internalAppointments.filter((appointment) => {
    const startMs = new Date(appointment.startTime).getTime();
    return Number.isFinite(startMs) && startMs >= rangeStartMs && startMs < rangeEndMs;
  });

  const invoiceStore = readInvoiceStore();
  const invoicesForClinic = invoiceStore.filter(
    (invoice) => invoice.deletedAt === null && invoice.clinicId === input.clinicId,
  );
  const invoicesInRange = invoicesForClinic.filter((invoice) => {
    const createdMs = new Date(invoice.createdAt).getTime();
    return Number.isFinite(createdMs) && createdMs >= rangeStartMs && createdMs < rangeEndMs;
  });

  const invoicesByAppointmentId = new Map<string, InvoiceAnalyticsRecord>();
  for (const invoice of invoicesForClinic) {
    if (invoice.appointmentId) invoicesByAppointmentId.set(invoice.appointmentId, invoice);
  }

  const uniquePatients = new Set<string>();
  let completedAppointments = 0;
  let noShows = 0;
  let cancelledAppointments = 0;

  for (const appointment of appointmentsInRange) {
    uniquePatients.add(appointment.patientId);
    const dateKey = new Date(appointment.startTime).toISOString().slice(0, 10);
    const trend = trendBuckets.get(dateKey);
    if (trend) {
      trend.appointmentsCount += 1;
      if (appointment.status === "COMPLETED") trend.completedAppointments += 1;
      if (appointment.status === "NO_SHOW") trend.noShows += 1;
    }

    if (appointment.status === "COMPLETED") completedAppointments += 1;
    if (appointment.status === "NO_SHOW") noShows += 1;
    if (appointment.status === "CANCELLED") cancelledAppointments += 1;

    const breakdown = serviceBreakdownMap.get(appointment.serviceId) ?? {
      serviceId: appointment.serviceId,
      serviceName: serviceNames.get(appointment.serviceId) ?? appointment.serviceId,
      appointmentsCount: 0,
      completedAppointments: 0,
      noShows: 0,
      billedCents: 0,
      collectedCents: 0,
    };
    breakdown.appointmentsCount += 1;
    if (appointment.status === "COMPLETED") breakdown.completedAppointments += 1;
    if (appointment.status === "NO_SHOW") breakdown.noShows += 1;

    const linkedInvoice = invoicesByAppointmentId.get(appointment.id);
    if (linkedInvoice && isActiveInvoiceStatus(linkedInvoice.status)) {
      const billedCents = moneyToCents(linkedInvoice.total);
      const collectedCents =
        linkedInvoice.status === "PAID"
          ? moneyToCents(linkedInvoice.paidAmount || linkedInvoice.total)
          : 0;
      breakdown.billedCents += billedCents;
      breakdown.collectedCents += collectedCents;
    }

    serviceBreakdownMap.set(appointment.serviceId, breakdown);
  }

  let totalBilledCents = 0;
  let totalCollectedCents = 0;
  let paidInvoices = 0;
  let overdueInvoices = 0;

  for (const invoice of invoicesInRange) {
    if (!isActiveInvoiceStatus(invoice.status)) continue;
    const billedCents = moneyToCents(invoice.total);
    const collectedCents =
      invoice.status === "PAID" ? moneyToCents(invoice.paidAmount || invoice.total) : 0;

    totalBilledCents += billedCents;
    totalCollectedCents += collectedCents;
    if (invoice.status === "PAID") paidInvoices += 1;
    if (invoice.status === "OVERDUE") overdueInvoices += 1;

    const dateKey = new Date(invoice.createdAt).toISOString().slice(0, 10);
    const trend = trendBuckets.get(dateKey);
    if (trend) {
      trend.billedCents += billedCents;
      trend.collectedCents += collectedCents;
    }
  }

  const patientList = await listPatientsForClinic({
    clinicId: input.clinicId,
    query: { page: 1, pageSize: 1 },
  });

  return {
    clinicId: input.clinicId,
    range: {
      days: input.days,
      startDate: formatUtcDateFromMs(rangeStartMs),
      endDate: formatUtcDateFromMs(rangeEndMs - 1),
    },
    summary: {
      appointmentsTotal: appointmentsInRange.length,
      completedAppointments,
      noShows,
      cancellationRatePercent: percent(cancelledAppointments, appointmentsInRange.length),
      invoicesTotal: invoicesInRange.filter((invoice) => isActiveInvoiceStatus(invoice.status)).length,
      paidInvoices,
      overdueInvoices,
      totalBilledCents,
      totalCollectedCents,
      outstandingCents: Math.max(totalBilledCents - totalCollectedCents, 0),
      collectionRatePercent: percent(totalCollectedCents, totalBilledCents),
      uniquePatientsSeen: uniquePatients.size || patientList.total,
    },
    trends: Array.from(trendBuckets.values()),
    serviceBreakdown: Array.from(serviceBreakdownMap.values()).sort(
      (a, b) => b.appointmentsCount - a.appointmentsCount || b.collectedCents - a.collectedCents,
    ),
    generatedAt: input.now.toISOString(),
    cache: {
      key: "",
      hit: false,
      ttlMs: ANALYTICS_CACHE_TTL_MS,
      expiresAt: input.now.toISOString(),
    },
  };
}

export async function getAnalyticsDashboardForClinic(input: {
  clinicId: string;
  days?: number;
  now?: Date;
}): Promise<AnalyticsServiceResult<AnalyticsDashboard>> {
  try {
    const days = normalizeRangeDays(input.days);
    const now = input.now ?? new Date();
    const cacheKey = `analytics:${input.clinicId}:days=${days}`;
    const cached = await getOrSetInMemoryCache({
      key: cacheKey,
      ttlMs: ANALYTICS_CACHE_TTL_MS,
      factory: () => buildAnalyticsDashboard({ clinicId: input.clinicId, days, now }),
    });

    return {
      ok: true,
      data: {
        ...cached.value,
        cache: {
          key: cacheKey,
          hit: cached.hit,
          ttlMs: ANALYTICS_CACHE_TTL_MS,
          expiresAt: new Date(cached.expiresAt).toISOString(),
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "ANALYTICS_BUILD_FAILED",
      message: error instanceof Error ? error.message : "Failed to build analytics dashboard.",
      status: 400,
    };
  }
}

export function invalidateAnalyticsCacheForClinic(clinicId: string) {
  return invalidateInMemoryCacheByPrefix(`analytics:${clinicId}:`);
}


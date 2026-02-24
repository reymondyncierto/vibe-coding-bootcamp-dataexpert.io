export type AnalyticsDashboardData = {
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
  trends: Array<{
    date: string;
    appointmentsCount: number;
    completedAppointments: number;
    noShows: number;
    billedCents: number;
    collectedCents: number;
  }>;
  serviceBreakdown: Array<{
    serviceId: string;
    serviceName: string;
    appointmentsCount: number;
    completedAppointments: number;
    noShows: number;
    billedCents: number;
    collectedCents: number;
  }>;
  generatedAt: string;
  cache: {
    key: string;
    hit: boolean;
    ttlMs: number;
    expiresAt: string;
  };
};


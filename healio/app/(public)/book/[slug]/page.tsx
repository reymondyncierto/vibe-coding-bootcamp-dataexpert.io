"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicBookingProviderSelector } from "@/components/appointments/public-booking-provider-selector";
import { PublicBookingServiceSelector } from "@/components/appointments/public-booking-service-selector";
import { PublicSlotPicker } from "@/components/appointments/public-slot-picker";
import { usePublicBooking } from "@/hooks/usePublicBooking";

export default function PublicBookingPage({
  params,
}: {
  params: { slug: string };
}) {
  const booking = usePublicBooking(params.slug);

  const clinic = booking.clinicQuery.data;
  const pageError =
    booking.clinicQuery.error instanceof Error ? booking.clinicQuery.error.message : null;

  return (
    <main className="min-h-screen bg-app px-4 py-6 text-ink sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <HeroHeader
          slug={params.slug}
          clinicName={clinic?.name}
          clinicMeta={
            clinic
              ? [clinic.address, clinic.phone, `${clinic.timezone} • ${clinic.currency}`]
                  .filter(Boolean)
                  .join(" • ")
              : null
          }
          isLoading={booking.clinicQuery.isLoading}
          errorMessage={pageError}
        />

        <section aria-label="Booking progress" className="grid gap-3 md:grid-cols-3">
          <ProgressCard
            step="1"
            title="Service"
            status={booking.selectedServiceId ? "done" : "active"}
            detail={
              booking.selectedService
                ? `${booking.selectedService.name} • ${booking.selectedService.durationMinutes} min`
                : "Choose visit type"
            }
          />
          <ProgressCard
            step="2"
            title="Provider"
            status={booking.selectedServiceId ? "active" : "todo"}
            detail={booking.selectedProviderId === "any" ? "Any available clinician" : "Specific clinician"}
          />
          <ProgressCard
            step="3"
            title="Time"
            status={booking.selectedSlot ? "done" : booking.selectedServiceId ? "active" : "todo"}
            detail={booking.selectedSlot ? booking.selectedSlot.label : "Pick a slot"}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <PublicBookingServiceSelector
              services={booking.servicesQuery.data}
              selectedServiceId={booking.selectedServiceId}
              onSelect={booking.setSelectedServiceId}
              isLoading={booking.servicesQuery.isLoading}
              errorMessage={
                booking.servicesQuery.error instanceof Error
                  ? booking.servicesQuery.error.message
                  : null
              }
            />

            <PublicBookingProviderSelector
              selectedProviderId={booking.selectedProviderId}
              onSelect={booking.setSelectedProviderId}
              disabled={!booking.selectedServiceId}
            />

            <PublicSlotPicker
              date={booking.selectedDate}
              onDateChange={booking.setSelectedDate}
              selectedService={booking.selectedService}
              selectedSlotStartTime={booking.selectedSlotStartTime}
              onSelectSlot={booking.setSelectedSlotStartTime}
              slots={booking.slotsQuery.data?.slots}
              isLoading={booking.slotsQuery.isLoading}
              errorMessage={
                booking.slotsQuery.error instanceof Error
                  ? booking.slotsQuery.error.message
                  : null
              }
            />
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking summary</CardTitle>
                <CardDescription>
                  Stripe-style progressive booking: choose your slot first, then enter patient
                  details in a drawer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SummaryRow
                  label="Clinic"
                  value={clinic?.name || (booking.clinicQuery.isLoading ? "Loading clinic..." : "Unavailable")}
                />
                <SummaryRow
                  label="Service"
                  value={booking.selectedService?.name || "Not selected"}
                  subdued={!booking.selectedService}
                />
                <SummaryRow
                  label="Provider"
                  value={booking.selectedProviderId === "any" ? "Any available clinician" : "Specific clinician"}
                  subdued={!booking.selectedProviderId}
                />
                <SummaryRow
                  label="Date"
                  value={booking.selectedDate || "Not selected"}
                  subdued={!booking.selectedDate}
                />
                <SummaryRow
                  label="Time"
                  value={booking.selectedSlot?.label || "Not selected"}
                  subdued={!booking.selectedSlot}
                />

                {booking.selectedSlot ? (
                  <div className="rounded-control border border-success/20 bg-success/5 p-4">
                    <p className="text-sm font-semibold text-ink">Step flow ready</p>
                    <p className="mt-1 text-sm text-muted">
                      Next task (`HEALIO-024`) adds the patient info drawer, submission, and
                      confirmation screen.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-control border border-dashed border-border bg-surface p-4">
                    <p className="text-sm font-semibold text-ink">
                      Your day is clear. Let&apos;s pick a slot.
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Select a service and time to unlock the patient details step.
                    </p>
                  </div>
                )}

                <Button className="w-full" disabled={!booking.selectedSlot}>
                  Continue to patient details
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need help booking?</CardTitle>
                <CardDescription>
                  This portal is built to be fast on mobile and simple for first-time patients.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-control border border-border bg-surface p-4">
                  <p className="text-sm font-semibold text-ink">1. Pick a visit type</p>
                  <p className="mt-1 text-sm text-muted">
                    Services show duration and price up front so there are no surprises.
                  </p>
                </div>
                <div className="rounded-control border border-border bg-surface p-4">
                  <p className="text-sm font-semibold text-ink">2. Pick a time</p>
                  <p className="mt-1 text-sm text-muted">
                    Only open times are shown based on clinic hours and current bookings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function HeroHeader({
  slug,
  clinicName,
  clinicMeta,
  isLoading,
  errorMessage,
}: {
  slug: string;
  clinicName?: string;
  clinicMeta?: string | null;
  isLoading: boolean;
  errorMessage: string | null;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-white to-success/10" />
        <CardContent className="relative grid gap-4 p-6 sm:p-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Healio Booking
            </p>
            {isLoading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
            ) : (
              <>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {clinicName || "Book your visit"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {clinicMeta || `Public booking portal for ${slug}`}
                </p>
              </>
            )}
            {errorMessage ? (
              <p className="mt-3 text-sm font-medium text-danger">
                We couldn&apos;t load this clinic profile: {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-card border border-border bg-surface/90 p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">Flow style</span>
              <Badge variant="primary">Frictionless</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">Mobile-ready</span>
              <Badge variant="success">Large tap targets</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">Next step</span>
              <Badge variant="neutral">Patient details drawer</Badge>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function ProgressCard({
  step,
  title,
  status,
  detail,
}: {
  step: string;
  title: string;
  status: "done" | "active" | "todo";
  detail: string;
}) {
  const badgeVariant =
    status === "done" ? "success" : status === "active" ? "primary" : "neutral";

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
            status === "done"
              ? "border-success/30 bg-success/10 text-success"
              : status === "active"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-surface text-muted",
          ].join(" ")}
          aria-hidden="true"
        >
          {step}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="truncate text-sm text-muted">{detail}</p>
        </div>
        <Badge variant={badgeVariant}>{status === "todo" ? "Pending" : status === "active" ? "In progress" : "Done"}</Badge>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  subdued = false,
}: {
  label: string;
  value: string;
  subdued?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={["text-right text-sm font-medium", subdued ? "text-muted" : "text-ink"].join(" ")}>
        {value}
      </span>
    </div>
  );
}

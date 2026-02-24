"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createIcsEvent, downloadIcsFile } from "@/lib/ics";

export type BookingConfirmationData = {
  bookingId: string;
  appointmentId: string;
  patientId: string;
  clinicSlug: string;
  serviceId: string;
  slotStartTime: string;
  slotEndTime: string;
  status: "SCHEDULED";
  idempotencyKey: string;
};

type Props = {
  clinicName: string;
  clinicAddress?: string | null;
  clinicEmail?: string | null;
  serviceName: string;
  patientName: string;
  confirmation: BookingConfirmationData;
  slotLabel: string;
  onBookAnother: () => void;
};

export function PublicBookingConfirmation({
  clinicName,
  clinicAddress,
  clinicEmail,
  serviceName,
  patientName,
  confirmation,
  slotLabel,
  onBookAnother,
}: Props) {
  const bookingDate = new Date(confirmation.slotStartTime);
  const friendlyDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(bookingDate);

  function handleDownloadIcs() {
    const ics = createIcsEvent({
      uid: confirmation.appointmentId,
      title: `${clinicName} - ${serviceName}`,
      description: `Appointment confirmed for ${patientName}.\nBooking ID: ${confirmation.bookingId}`,
      location: clinicAddress || clinicName,
      startTimeIso: confirmation.slotStartTime,
      endTimeIso: confirmation.slotEndTime,
      organizerEmail: clinicEmail || undefined,
    });
    downloadIcsFile(`healio-booking-${confirmation.bookingId}.ics`, ics);
  }

  return (
    <Card className="border-success/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Appointment confirmed</CardTitle>
            <CardDescription>
              Your booking is reserved. Save it to your calendar or book another visit.
            </CardDescription>
          </div>
          <Badge variant="success">Confirmed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-control border border-success/20 bg-success/5 p-4">
          <p className="text-sm font-semibold text-ink">{patientName}</p>
          <p className="mt-1 text-sm text-muted">
            {serviceName} • {friendlyDate} • {slotLabel}
          </p>
          <p className="mt-1 text-sm text-muted">{clinicName}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile label="Booking ID" value={confirmation.bookingId} />
          <InfoTile label="Appointment ID" value={confirmation.appointmentId} />
          <InfoTile label="Status" value={confirmation.status} />
          <InfoTile label="Idempotency key" value={confirmation.idempotencyKey} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={handleDownloadIcs}>
            Download .ics
          </Button>
          <Button type="button" variant="secondary" onClick={onBookAnother}>
            Book another appointment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-border bg-surface p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

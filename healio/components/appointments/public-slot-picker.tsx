"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicService, PublicSlot } from "@/hooks/usePublicBooking";

type Props = {
  date: string;
  onDateChange: (value: string) => void;
  selectedService: PublicService | null;
  selectedSlotStartTime: string | null;
  onSelectSlot: (value: string) => void;
  slots: PublicSlot[] | undefined;
  isLoading: boolean;
  errorMessage?: string | null;
};

export function PublicSlotPicker({
  date,
  onDateChange,
  selectedService,
  selectedSlotStartTime,
  onSelectSlot,
  slots,
  isLoading,
  errorMessage,
}: Props) {
  const disabled = !selectedService;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>3. Pick a time</CardTitle>
            <CardDescription>
              Available slots are filtered using clinic hours and booking rules.
            </CardDescription>
          </div>
          <Badge variant={selectedSlotStartTime ? "success" : "neutral"}>
            {selectedSlotStartTime ? "Slot selected" : "Choose a time"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block" htmlFor="public-booking-date">
          <span className="healio-label">Appointment date</span>
          <Input
            id="public-booking-date"
            name="appointmentDate"
            type="date"
            className="mt-1"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            disabled={disabled}
            aria-label="Appointment date"
          />
        </label>

        {disabled ? (
          <div className="rounded-control border border-dashed border-border bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Select a service first</p>
            <p className="mt-1 text-sm text-muted">
              We’ll show available time slots after you choose a visit type.
            </p>
          </div>
        ) : null}

        {!disabled && isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : null}

        {!disabled && !isLoading && errorMessage ? (
          <div className="rounded-control border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm font-semibold text-danger">Couldn&apos;t load slots</p>
            <p className="mt-1 text-sm text-muted">{errorMessage}</p>
          </div>
        ) : null}

        {!disabled && !isLoading && !errorMessage && slots?.length === 0 ? (
          <div className="rounded-control border border-dashed border-border bg-surface p-4">
            <p className="text-sm font-semibold text-ink">No open slots for this day</p>
            <p className="mt-1 text-sm text-muted">
              Try another date. Healio is applying clinic hours, lead time, and current bookings.
            </p>
          </div>
        ) : null}

        {!disabled && !isLoading && !errorMessage && slots?.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {slots.map((slot) => {
              const selected = slot.startTime === selectedSlotStartTime;
              return (
                <Button
                  key={slot.startTime}
                  type="button"
                  variant={selected ? "primary" : "secondary"}
                  className="justify-center"
                  onClick={() => onSelectSlot(slot.startTime)}
                  aria-pressed={selected}
                >
                  {slot.label}
                </Button>
              );
            })}
          </div>
        ) : null}

        {selectedService ? (
          <div className="rounded-control border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Selected service details</p>
            <p className="mt-1 text-sm text-muted">
              {selectedService.name} • {selectedService.durationMinutes} minutes • ₱
              {selectedService.price}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

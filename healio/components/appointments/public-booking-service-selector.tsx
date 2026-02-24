"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicService } from "@/hooks/usePublicBooking";

type Props = {
  services: PublicService[] | undefined;
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
  isLoading: boolean;
  errorMessage?: string | null;
};

export function PublicBookingServiceSelector({
  services,
  selectedServiceId,
  onSelect,
  isLoading,
  errorMessage,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>1. Choose a service</CardTitle>
            <CardDescription>
              Select the visit type first so we can show the right time slots.
            </CardDescription>
          </div>
          <Badge variant={selectedServiceId ? "success" : "neutral"}>
            {selectedServiceId ? "Selected" : "Required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-control border border-border bg-surface p-4"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-5/6" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-7 w-16 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            ))
          : null}

        {!isLoading && errorMessage ? (
          <div className="md:col-span-2 rounded-control border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm font-semibold text-danger">Couldn&apos;t load services</p>
            <p className="mt-1 text-sm text-muted">{errorMessage}</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && services?.length === 0 ? (
          <div className="md:col-span-2 rounded-control border border-dashed border-border bg-surface p-5">
            <p className="text-sm font-semibold text-ink">No services published yet</p>
            <p className="mt-1 text-sm text-muted">
              This clinic has not configured public booking services. Please call the clinic to
              schedule your visit.
            </p>
          </div>
        ) : null}

        {!isLoading &&
          !errorMessage &&
          services?.map((service) => {
            const selected = service.id === selectedServiceId;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onSelect(service.id)}
                className={[
                  "rounded-control border bg-surface p-4 text-left shadow-sm transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  selected
                    ? "border-primary shadow-[0_0_0_1px_rgba(14,116,144,0.15)]"
                    : "border-border hover:border-primary/30 hover:bg-slate-50",
                ].join(" ")}
                aria-pressed={selected}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{service.name}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">
                      {service.description || "Standard clinic service booking."}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="mt-1 h-3 w-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: service.color }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="neutral">{service.durationMinutes} min</Badge>
                  <Badge variant="primary">
                    {service.price.startsWith("$") || service.price.startsWith("₱")
                      ? service.price
                      : `₱${service.price}`}
                  </Badge>
                </div>
              </button>
            );
          })}
      </CardContent>
      {!selectedServiceId && !isLoading && services?.length ? (
        <div className="px-5 pb-5">
          <Button type="button" variant="secondary" className="w-full" disabled>
            Select a service to continue
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

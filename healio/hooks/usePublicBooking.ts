"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useDeferredValue, useState } from "react";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown } };
type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type PublicClinicProfile = {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string;
  timezone: string;
  currency: "USD" | "PHP";
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  color: string;
};

export type PublicSlot = {
  startTime: string;
  endTime: string;
  label: string;
};

type PublicSlotsPayload = {
  clinicSlug: string;
  date: string;
  timezone: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  slots: PublicSlot[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !json.success) {
    const message = "success" in json && !json.success ? json.error.message : "Request failed";
    throw new Error(message);
  }
  return json.data;
}

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function defaultBookingDate() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return toDateInputValue(next);
}

export function usePublicBooking(slug: string) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState("any");
  const [selectedDate, setSelectedDate] = useState(defaultBookingDate);
  const [selectedSlotStartTime, setSelectedSlotStartTime] = useState<string | null>(null);

  const deferredServiceId = useDeferredValue(selectedServiceId);
  const deferredDate = useDeferredValue(selectedDate);

  const clinicQuery = useQuery({
    queryKey: ["public-booking", "clinic", slug],
    queryFn: () => fetchJson<PublicClinicProfile>(`/api/v1/public/clinics/${slug}`),
  });

  const servicesQuery = useQuery({
    queryKey: ["public-booking", "services", slug],
    queryFn: () => fetchJson<PublicService[]>(`/api/v1/public/clinics/${slug}/services`),
  });

  useEffect(() => {
    if (!servicesQuery.data?.length) return;
    if (selectedServiceId) return;
    setSelectedServiceId(servicesQuery.data[0].id);
  }, [servicesQuery.data, selectedServiceId]);

  const slotsQuery = useQuery({
    queryKey: ["public-booking", "slots", slug, deferredDate, deferredServiceId],
    enabled: Boolean(deferredServiceId && deferredDate),
    queryFn: () =>
      fetchJson<PublicSlotsPayload>(
        `/api/v1/public/clinics/${slug}/slots?date=${encodeURIComponent(deferredDate)}&serviceId=${encodeURIComponent(
          deferredServiceId as string,
        )}`,
      ),
  });

  useEffect(() => {
    setSelectedSlotStartTime(null);
  }, [selectedServiceId, selectedDate]);

  useEffect(() => {
    if (!selectedSlotStartTime || !slotsQuery.data) return;
    const exists = slotsQuery.data.slots.some((slot) => slot.startTime === selectedSlotStartTime);
    if (!exists) setSelectedSlotStartTime(null);
  }, [slotsQuery.data, selectedSlotStartTime]);

  const selectedService =
    servicesQuery.data?.find((service) => service.id === selectedServiceId) ?? null;
  const selectedSlot =
    slotsQuery.data?.slots.find((slot) => slot.startTime === selectedSlotStartTime) ?? null;

  return {
    clinicQuery,
    servicesQuery,
    slotsQuery,
    selectedServiceId,
    selectedService,
    setSelectedServiceId,
    selectedProviderId,
    setSelectedProviderId,
    selectedDate,
    setSelectedDate,
    selectedSlotStartTime,
    selectedSlot,
    setSelectedSlotStartTime,
  };
}

"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

export type PublicBookingPatientFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PublicBookingPatientFormValues) => Promise<void> | void;
  submitting?: boolean;
  submitError?: string | null;
  clinicName?: string | null;
  serviceName?: string | null;
  slotLabel?: string | null;
  appointmentDate?: string | null;
};

const EMPTY_VALUES: PublicBookingPatientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

export function PublicBookingPatientFormDrawer({
  open,
  onClose,
  onSubmit,
  submitting = false,
  submitError,
  clinicName,
  serviceName,
  slotLabel,
  appointmentDate,
}: Props) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
  }, [open]);

  const fieldErrors = getFieldErrors(values);

  async function handleSubmit() {
    setTouched(true);
    if (fieldErrors.firstName || fieldErrors.lastName || fieldErrors.email || fieldErrors.phone) {
      return;
    }
    await onSubmit(values);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Patient details"
      description="Quick, in-context booking form. We’ll confirm your appointment without leaving this page."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={submitting}>
            Confirm booking
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-control border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Booking summary</p>
          <p className="mt-1 text-sm text-muted">{clinicName || "Clinic"} • {serviceName || "Service"}</p>
          <p className="text-sm text-muted">
            {appointmentDate || "Date pending"} {slotLabel ? `• ${slotLabel}` : ""}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            value={values.firstName}
            onChange={(value) => setValues((current) => ({ ...current, firstName: value }))}
            error={touched ? fieldErrors.firstName : undefined}
            autoComplete="given-name"
            name="firstName"
          />
          <FormField
            label="Last name"
            value={values.lastName}
            onChange={(value) => setValues((current) => ({ ...current, lastName: value }))}
            error={touched ? fieldErrors.lastName : undefined}
            autoComplete="family-name"
            name="lastName"
          />
        </div>

        <FormField
          label="Email"
          type="email"
          value={values.email}
          onChange={(value) => setValues((current) => ({ ...current, email: value }))}
          error={touched ? fieldErrors.email : undefined}
          autoComplete="email"
          name="email"
        />

        <FormField
          label="Phone"
          value={values.phone}
          onChange={(value) => setValues((current) => ({ ...current, phone: value }))}
          error={touched ? fieldErrors.phone : undefined}
          autoComplete="tel"
          placeholder="+63 917 123 4567"
          name="phone"
        />

        <label className="block">
          <span className="healio-label">Notes (optional)</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            value={values.notes}
            onChange={(event) =>
              setValues((current) => ({ ...current, notes: event.target.value }))
            }
            maxLength={1000}
            name="notes"
            placeholder="Anything the clinic should know before your visit?"
          />
        </label>

        {submitError ? (
          <div className="rounded-control border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm font-semibold text-danger">Booking could not be completed</p>
            <p className="mt-1 text-sm text-muted">{submitError}</p>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function FormField({
  label,
  error,
  value,
  onChange,
  type = "text",
  name,
  placeholder,
  autoComplete,
}: {
  label: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `public-booking-${name}`;

  return (
    <label className="block" htmlFor={id}>
      <span className="healio-label">{label}</span>
      <Input
        id={id}
        name={name}
        className="mt-1"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        hasError={Boolean(error)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </label>
  );
}

function getFieldErrors(values: PublicBookingPatientFormValues) {
  return {
    firstName: values.firstName.trim() ? undefined : "First name is required.",
    lastName: values.lastName.trim() ? undefined : "Last name is required.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
      ? undefined
      : "Enter a valid email address.",
    phone: values.phone.trim().length >= 5 ? undefined : "Enter a phone number.",
  };
}

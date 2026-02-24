"use client";

import { Input } from "@/components/ui/input";

export type SoapNoteEditorValue = {
  appointmentId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TextareaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 4,
  disabled = false,
}: {
  label: string;
  name: keyof SoapNoteEditorValue;
  value: string;
  onChange: (name: keyof SoapNoteEditorValue, value: string) => void;
  placeholder: string;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="healio-label">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        name={String(name)}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cx(
          "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm",
          "placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted",
        )}
      />
    </label>
  );
}

export function SoapNoteEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: SoapNoteEditorValue;
  onChange: (next: SoapNoteEditorValue) => void;
  disabled?: boolean;
}) {
  function updateField(name: keyof SoapNoteEditorValue, nextValue: string) {
    onChange({ ...value, [name]: nextValue });
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="healio-label">Appointment ID *</span>
        <Input
          name="appointmentId"
          value={value.appointmentId}
          onChange={(event) => updateField("appointmentId", event.target.value)}
          placeholder="appt_12345"
          disabled={disabled}
          required
        />
      </label>

      <TextareaField
        label="Subjective"
        name="subjective"
        value={value.subjective}
        onChange={updateField}
        placeholder="Patient-reported symptoms, concerns, and progress..."
        rows={5}
        required
        disabled={disabled}
      />
      <TextareaField
        label="Objective"
        name="objective"
        value={value.objective}
        onChange={updateField}
        placeholder="Vitals, observed findings, exam notes..."
        rows={4}
        disabled={disabled}
      />
      <TextareaField
        label="Assessment"
        name="assessment"
        value={value.assessment}
        onChange={updateField}
        placeholder="Clinical impression, diagnosis, or working assessment..."
        rows={4}
        disabled={disabled}
      />
      <TextareaField
        label="Plan"
        name="plan"
        value={value.plan}
        onChange={updateField}
        placeholder="Treatment plan, follow-up instructions, meds, referrals..."
        rows={4}
        disabled={disabled}
      />
    </div>
  );
}

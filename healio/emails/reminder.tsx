import type { RenderedEmailTemplate } from "./booking-confirmation";

export type ReminderEmailInput = {
  clinicName: string;
  patientName: string;
  serviceName: string;
  appointmentLabel: string;
  leadLabel: "24-hour" | "1-hour" | string;
  providerName?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderReminderEmail(input: ReminderEmailInput): RenderedEmailTemplate {
  const subject = `${input.clinicName}: ${input.leadLabel} reminder for ${input.appointmentLabel}`;
  const providerLine = input.providerName ? `<p><strong>Provider:</strong> ${escapeHtml(input.providerName)}</p>` : "";

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #111827; background: #F9FAFB; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase;">Appointment Reminder</p>
        <h1 style="margin: 0 0 12px; font-size: 22px; line-height: 1.2;">${escapeHtml(input.leadLabel)} reminder for your appointment</h1>
        <p style="margin: 0 0 16px; color: #475569;">${escapeHtml(input.patientName)}, this is a quick reminder from ${escapeHtml(input.clinicName)}.</p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;">
          <p><strong>Service:</strong> ${escapeHtml(input.serviceName)}</p>
          <p><strong>When:</strong> ${escapeHtml(input.appointmentLabel)}</p>
          ${providerLine}
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    `${input.leadLabel} Reminder - ${input.clinicName}`,
    `${input.patientName}, this is a reminder for your appointment.`,
    `Service: ${input.serviceName}`,
    `When: ${input.appointmentLabel}`,
    input.providerName ? `Provider: ${input.providerName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

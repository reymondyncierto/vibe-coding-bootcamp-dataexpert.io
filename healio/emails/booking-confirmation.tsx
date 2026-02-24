export type BookingConfirmationEmailInput = {
  clinicName: string;
  patientName: string;
  serviceName: string;
  appointmentLabel: string;
  providerName?: string | null;
  locationLabel?: string | null;
};

export type RenderedEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderBookingConfirmationEmail(input: BookingConfirmationEmailInput): RenderedEmailTemplate {
  const subject = `${input.clinicName}: Booking confirmed for ${input.appointmentLabel}`;
  const providerLine = input.providerName ? `<p><strong>Provider:</strong> ${escapeHtml(input.providerName)}</p>` : "";
  const locationLine = input.locationLabel ? `<p><strong>Location:</strong> ${escapeHtml(input.locationLabel)}</p>` : "";

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #111827; background: #F9FAFB; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase;">Booking Confirmation</p>
        <h1 style="margin: 0 0 12px; font-size: 22px; line-height: 1.2;">Hi ${escapeHtml(input.patientName)}, your appointment is confirmed.</h1>
        <p style="margin: 0 0 16px; color: #475569;">${escapeHtml(input.clinicName)} has reserved your schedule for the visit below.</p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;">
          <p><strong>Service:</strong> ${escapeHtml(input.serviceName)}</p>
          <p><strong>When:</strong> ${escapeHtml(input.appointmentLabel)}</p>
          ${providerLine}
          ${locationLine}
        </div>
        <p style="margin: 16px 0 0; color: #475569;">If you need to reschedule, reply to this message or contact the clinic front desk.</p>
      </div>
    </div>
  `.trim();

  const text = [
    `Booking Confirmation - ${input.clinicName}`,
    `Hi ${input.patientName}, your appointment is confirmed.`,
    `Service: ${input.serviceName}`,
    `When: ${input.appointmentLabel}`,
    input.providerName ? `Provider: ${input.providerName}` : null,
    input.locationLabel ? `Location: ${input.locationLabel}` : null,
    "If you need to reschedule, reply to this message or contact the clinic front desk.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

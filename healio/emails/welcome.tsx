import type { RenderedEmailTemplate } from "./booking-confirmation";

export type WelcomeEmailInput = {
  clinicName: string;
  ownerName: string;
  bookingPortalUrl?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderWelcomeEmail(input: WelcomeEmailInput): RenderedEmailTemplate {
  const subject = `Welcome to Healio, ${input.clinicName}`;
  const portalLine = input.bookingPortalUrl
    ? `<p style="margin: 0;"><strong>Booking page:</strong> <a href="${escapeHtml(input.bookingPortalUrl)}">${escapeHtml(input.bookingPortalUrl)}</a></p>`
    : "";
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #111827; background: #F9FAFB; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase;">Welcome to Healio</p>
        <h1 style="margin: 0 0 12px; font-size: 22px; line-height: 1.2;">Hi ${escapeHtml(input.ownerName)}, your clinic workspace is ready.</h1>
        <p style="margin: 0 0 16px; color: #475569;">${escapeHtml(input.clinicName)} can now manage appointments, patient records, billing, and reminders from a single dashboard.</p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; display: grid; gap: 8px;">
          <p style="margin: 0;"><strong>First steps:</strong> Add services, set clinic hours, and invite staff.</p>
          ${portalLine}
        </div>
      </div>
    </div>
  `.trim();
  const text = [
    `Welcome to Healio, ${input.clinicName}`,
    `Hi ${input.ownerName}, your clinic workspace is ready.`,
    "First steps: add services, set clinic hours, and invite staff.",
    input.bookingPortalUrl ? `Booking page: ${input.bookingPortalUrl}` : null,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

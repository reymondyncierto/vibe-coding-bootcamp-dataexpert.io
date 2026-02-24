export type InvoiceEmailTemplateInput = {
  patientName: string;
  clinicName?: string;
  invoiceNumber: string;
  dueDate: string;
  total: string;
  currency: string;
  payLinkUrl: string;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

export function renderInvoiceEmailTemplate(input: InvoiceEmailTemplateInput) {
  const clinicName = input.clinicName || "Healio Clinic";
  const subject = `${clinicName}: Invoice ${input.invoiceNumber}`;
  const dueDate = formatDate(input.dueDate);
  const amountText = `${input.currency} ${input.total}`;

  const text = [
    `Hi ${input.patientName},`,
    "",
    `${clinicName} has sent you invoice ${input.invoiceNumber}.`,
    `Amount due: ${amountText}`,
    `Due date: ${dueDate}`,
    "",
    `Pay online: ${input.payLinkUrl}`,
    "",
    "If you have any questions, please reply to this email or contact the clinic.",
  ].join("\n");

  const html = `
    <div style="background:#F9FAFB;padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0F172A;">
      <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
        <div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;">
          <div style="font-size:12px;letter-spacing:.08em;color:#64748B;text-transform:uppercase;">${clinicName}</div>
          <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;">Invoice ${input.invoiceNumber}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;">Hi ${input.patientName},</p>
          <p style="margin:0 0 16px;color:#475569;">Your invoice is ready. You can review the amount due and pay online using the secure link below.</p>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin:0 0 18px;">
            <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:.08em;">Amount Due</div>
            <div style="margin-top:6px;font-size:24px;font-weight:700;color:#0F172A;">${amountText}</div>
            <div style="margin-top:8px;color:#64748B;font-size:14px;">Due by ${dueDate}</div>
          </div>
          <a href="${input.payLinkUrl}" style="display:inline-block;background:#0EA5A8;color:#fff;text-decoration:none;border-radius:12px;padding:12px 16px;font-weight:600;">Pay Invoice Securely</a>
          <p style="margin:16px 0 0;color:#64748B;font-size:13px;word-break:break-all;">If the button does not work, copy and paste this link:<br/>${input.payLinkUrl}</p>
        </div>
      </div>
    </div>
  `.trim();

  return { subject, html, text };
}

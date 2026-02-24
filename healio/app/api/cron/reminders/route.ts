import { errorResponse, successResponse, withRouteErrorHandling } from "@/lib/api-helpers";
import { renderReminderEmail } from "@/emails/reminder";
import { listPublicBookingReminderCandidates } from "@/services/appointmentService";
import {
  sendEmailNotificationForClinic,
  sendSmsNotificationForClinic,
  type NotificationType,
} from "@/services/notificationService";

const LEAD_PRESETS = {
  "24h": { minutes: 24 * 60, type: "REMINDER_24H" as NotificationType, label: "24-hour" },
  "1h": { minutes: 60, type: "REMINDER_1H" as NotificationType, label: "1-hour" },
} as const;

type LeadKey = keyof typeof LEAD_PRESETS;

function isCronAuthorized(request: Request) {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) {
    return { ok: false as const, response: errorResponse("CRON_SECRET_MISSING", "CRON_SECRET is not configured.", 500) };
  }

  const authHeader = request.headers.get("authorization")?.trim();
  const bearer = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const candidate = bearer || headerSecret;

  if (candidate !== configured) {
    return { ok: false as const, response: errorResponse("FORBIDDEN", "Invalid cron secret.", 403) };
  }

  return { ok: true as const };
}

function parseLeadSelection(url: URL): LeadKey[] {
  const lead = (url.searchParams.get("lead") || "all").toLowerCase();
  if (lead === "24h" || lead === "1h") return [lead];
  return ["24h", "1h"];
}

function parseNow(url: URL) {
  const raw = url.searchParams.get("now");
  if (!raw) return new Date();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAppointmentLabel(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(iso));
}

async function runDispatch(request: Request) {
  const url = new URL(request.url);
  const auth = isCronAuthorized(request);
  if (!auth.ok) return auth.response;

  const now = parseNow(url);
  if (!now) {
    return errorResponse("INVALID_NOW", "Invalid `now` query parameter.", 400);
  }

  const windowMinutesRaw = Number(url.searchParams.get("windowMinutes") || "10");
  const windowMinutes = Number.isFinite(windowMinutesRaw) && windowMinutesRaw > 0
    ? Math.min(60, Math.floor(windowMinutesRaw))
    : 10;
  const leads = parseLeadSelection(url);

  const summary = {
    now: now.toISOString(),
    windowMinutes,
    leads,
    scanned: 0,
    emailSent: 0,
    emailReplayed: 0,
    smsSent: 0,
    smsReplayed: 0,
    failures: 0,
    items: [] as Array<{
      lead: LeadKey;
      appointmentId: string;
      clinicId: string;
      email: { ok: boolean; replayed?: boolean; code?: string };
      sms?: { ok: boolean; replayed?: boolean; code?: string };
    }>,
  };

  for (const leadKey of leads) {
    const leadConfig = LEAD_PRESETS[leadKey];
    const candidates = await listPublicBookingReminderCandidates({
      now,
      leadMinutes: leadConfig.minutes,
      windowMinutes,
    });

    for (const candidate of candidates) {
      summary.scanned += 1;
      const appointmentLabel = formatAppointmentLabel(candidate.slotStartTime, candidate.timezone);
      const reminderEmail = renderReminderEmail({
        clinicName: candidate.clinicName,
        patientName: candidate.patientId,
        serviceName: candidate.serviceName,
        appointmentLabel,
        leadLabel: leadConfig.label,
      });

      const emailResult = await sendEmailNotificationForClinic({
        clinicId: candidate.clinicId,
        type: leadConfig.type,
        appointmentId: candidate.appointmentId,
        patientId: candidate.patientId,
        recipientEmail: candidate.patientEmail,
        subject: reminderEmail.subject,
        html: reminderEmail.html,
        text: reminderEmail.text,
        idempotencyKey: `reminder:${leadKey}:email:${candidate.appointmentId}`,
        metadata: {
          clinicSlug: candidate.clinicSlug,
          appointmentId: candidate.appointmentId,
          lead: leadKey,
        },
      });

      let emailSummary: { ok: boolean; replayed?: boolean; code?: string };
      if (emailResult.ok) {
        if (emailResult.data.replayed) summary.emailReplayed += 1;
        else summary.emailSent += 1;
        emailSummary = { ok: true, replayed: emailResult.data.replayed };
      } else {
        summary.failures += 1;
        emailSummary = { ok: false, code: emailResult.code };
      }

      let smsSummary: { ok: boolean; replayed?: boolean; code?: string } | undefined;
      const candidatePhone = null;
      if (candidatePhone) {
        const smsResult = await sendSmsNotificationForClinic({
          clinicId: candidate.clinicId,
          type: leadConfig.type,
          appointmentId: candidate.appointmentId,
          patientId: candidate.patientId,
          recipientPhone: candidatePhone,
          body: `${candidate.clinicName}: ${leadConfig.label} reminder for ${appointmentLabel} (${candidate.serviceName}).`,
          idempotencyKey: `reminder:${leadKey}:sms:${candidate.appointmentId}`,
          metadata: { clinicSlug: candidate.clinicSlug, appointmentId: candidate.appointmentId, lead: leadKey },
        });
        if (smsResult.ok) {
          if (smsResult.data.replayed) summary.smsReplayed += 1;
          else summary.smsSent += 1;
          smsSummary = { ok: true, replayed: smsResult.data.replayed };
        } else {
          summary.failures += 1;
          smsSummary = { ok: false, code: smsResult.code };
        }
      }

      summary.items.push({
        lead: leadKey,
        appointmentId: candidate.appointmentId,
        clinicId: candidate.clinicId,
        email: emailSummary,
        ...(smsSummary ? { sms: smsSummary } : {}),
      });
    }
  }

  return successResponse(summary);
}

export async function GET(request: Request) {
  return withRouteErrorHandling(() => runDispatch(request));
}

export async function POST(request: Request) {
  return withRouteErrorHandling(() => runDispatch(request));
}

import crypto from "node:crypto";
import { sendEmailWithResend } from "@/lib/resend";
import { sendSmsWithTwilio } from "@/lib/twilio";

export type NotificationType =
  | "BOOKING_CONFIRMATION"
  | "REMINDER_24H"
  | "REMINDER_1H"
  | "NO_SHOW_FOLLOWUP"
  | "INVOICE_SENT"
  | "PAYMENT_CONFIRMATION"
  | "FOLLOWUP_REMINDER";

export type NotificationChannel = "EMAIL" | "SMS";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export type NotificationRecord = {
  id: string;
  clinicId: string;
  appointmentId: string | null;
  patientId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  recipientEmail: string | null;
  recipientPhone: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  idempotencyKey: string | null;
  metadata: Record<string, string> | null;
};

export type NotificationServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };

export type QueueNotificationResult = {
  notification: NotificationRecord;
  replayed: boolean;
  dailyCountForRecipient: number;
};

export type InvoiceEmailDeliveryPayload = {
  clinicId: string;
  invoiceId: string;
  invoiceNumber: string;
  patientId: string;
  patientEmail: string;
  patientName: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string | null;
};

export type InvoiceEmailDeliveryResult = {
  notification: NotificationRecord;
  replayed: boolean;
  provider: "resend" | "resend-fallback";
  providerMessageId: string | null;
};

export type EmailDeliveryPayload = {
  clinicId: string;
  type: NotificationType;
  patientId?: string | null;
  appointmentId?: string | null;
  recipientEmail: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, string> | null;
};

export type EmailDeliveryResult = {
  notification: NotificationRecord;
  replayed: boolean;
  provider: "resend" | "resend-fallback";
  providerMessageId: string | null;
};

export type SmsDeliveryPayload = {
  clinicId: string;
  type: NotificationType;
  patientId?: string | null;
  appointmentId?: string | null;
  recipientPhone: string;
  body: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, string> | null;
};

export type SmsDeliveryResult = {
  notification: NotificationRecord;
  replayed: boolean;
  provider: "twilio" | "twilio-fallback";
  providerMessageId: string | null;
};

const DAILY_NOTIFICATION_CAP = 3;

type IdempotencyStore = Map<string, string>;

function getNotificationStore() {
  const globalScope = globalThis as typeof globalThis & {
    __healioNotificationStore?: NotificationRecord[];
  };
  if (!globalScope.__healioNotificationStore) {
    globalScope.__healioNotificationStore = [];
  }
  return globalScope.__healioNotificationStore;
}

function getNotificationIdempotencyStore(): IdempotencyStore {
  const globalScope = globalThis as typeof globalThis & {
    __healioNotificationIdempotencyStore?: IdempotencyStore;
  };
  if (!globalScope.__healioNotificationIdempotencyStore) {
    globalScope.__healioNotificationIdempotencyStore = new Map();
  }
  return globalScope.__healioNotificationIdempotencyStore;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeRecipient(input: {
  patientId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
}) {
  return (
    input.patientId?.trim() ||
    input.recipientEmail?.trim().toLowerCase() ||
    input.recipientPhone?.trim() ||
    null
  );
}

function dayKeyFromIso(iso: string) {
  return iso.slice(0, 10);
}

function countNotificationsForDailyCap(input: {
  clinicId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientKey: string;
  dayKey: string;
}) {
  return getNotificationStore().filter((record) => {
    const recordRecipient = normalizeRecipient(record);
    return (
      record.clinicId === input.clinicId &&
      record.type === input.type &&
      record.channel === input.channel &&
      recordRecipient === input.recipientKey &&
      dayKeyFromIso(record.createdAt) === input.dayKey &&
      record.status !== "FAILED"
    );
  }).length;
}

export function queueNotificationForClinic(input: {
  clinicId: string;
  type: NotificationType;
  channel: NotificationChannel;
  appointmentId?: string | null;
  patientId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, string> | null;
  now?: Date;
}): NotificationServiceResult<QueueNotificationResult> {
  const clinicId = input.clinicId?.trim();
  if (!clinicId) {
    return { ok: false, code: "CLINIC_ID_REQUIRED", message: "clinicId is required.", status: 400 };
  }

  if (input.channel === "EMAIL" && !input.recipientEmail?.trim()) {
    return {
      ok: false,
      code: "RECIPIENT_EMAIL_REQUIRED",
      message: "recipientEmail is required for EMAIL notifications.",
      status: 400,
    };
  }
  if (input.channel === "SMS" && !input.recipientPhone?.trim()) {
    return {
      ok: false,
      code: "RECIPIENT_PHONE_REQUIRED",
      message: "recipientPhone is required for SMS notifications.",
      status: 400,
    };
  }

  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (idempotencyKey) {
    const key = `${clinicId}:${idempotencyKey}`;
    const existingId = getNotificationIdempotencyStore().get(key);
    if (existingId) {
      const existing = getNotificationStore().find((record) => record.id === existingId && record.clinicId === clinicId);
      if (existing) {
        const recipientKey = normalizeRecipient(existing) ?? "unknown";
        return {
          ok: true,
          data: {
            notification: clone(existing),
            replayed: true,
            dailyCountForRecipient: countNotificationsForDailyCap({
              clinicId,
              type: existing.type,
              channel: existing.channel,
              recipientKey,
              dayKey: dayKeyFromIso(existing.createdAt),
            }),
          },
        };
      }
    }
  }

  const nowIso = (input.now ?? new Date()).toISOString();
  const recipientKey = normalizeRecipient(input);
  if (!recipientKey) {
    return {
      ok: false,
      code: "RECIPIENT_REQUIRED",
      message: "A patientId, recipientEmail, or recipientPhone is required.",
      status: 400,
    };
  }

  const dailyCount = countNotificationsForDailyCap({
    clinicId,
    type: input.type,
    channel: input.channel,
    recipientKey,
    dayKey: dayKeyFromIso(nowIso),
  });
  if (dailyCount >= DAILY_NOTIFICATION_CAP) {
    return {
      ok: false,
      code: "DAILY_NOTIFICATION_CAP_REACHED",
      message: "Daily notification cap reached for this recipient and notification type/channel.",
      status: 429,
      details: {
        cap: DAILY_NOTIFICATION_CAP,
        recipientKey,
        type: input.type,
        channel: input.channel,
      },
    };
  }

  const record: NotificationRecord = {
    id: `ntf_${crypto.randomUUID()}`,
    clinicId,
    appointmentId: input.appointmentId?.trim() || null,
    patientId: input.patientId?.trim() || null,
    type: input.type,
    channel: input.channel,
    recipientEmail: input.recipientEmail?.trim().toLowerCase() || null,
    recipientPhone: input.recipientPhone?.trim() || null,
    status: "PENDING",
    sentAt: null,
    errorMessage: null,
    createdAt: nowIso,
    idempotencyKey,
    metadata: input.metadata ? { ...input.metadata } : null,
  };

  getNotificationStore().push(record);
  if (idempotencyKey) {
    getNotificationIdempotencyStore().set(`${clinicId}:${idempotencyKey}`, record.id);
  }

  return {
    ok: true,
    data: {
      notification: clone(record),
      replayed: false,
      dailyCountForRecipient: dailyCount + 1,
    },
  };
}

export function markNotificationSentForClinic(input: {
  clinicId: string;
  notificationId: string;
  sentAt?: Date;
}): NotificationServiceResult<NotificationRecord> {
  const store = getNotificationStore();
  const index = store.findIndex(
    (record) => record.id === input.notificationId && record.clinicId === input.clinicId,
  );
  if (index === -1) {
    return { ok: false, code: "NOTIFICATION_NOT_FOUND", message: "Notification not found.", status: 404 };
  }

  const current = store[index];
  const updated: NotificationRecord = {
    ...current,
    status: "SENT",
    sentAt: (input.sentAt ?? new Date()).toISOString(),
    errorMessage: null,
  };
  store[index] = updated;
  return { ok: true, data: clone(updated) };
}

export function markNotificationFailedForClinic(input: {
  clinicId: string;
  notificationId: string;
  errorMessage: string;
}): NotificationServiceResult<NotificationRecord> {
  const store = getNotificationStore();
  const index = store.findIndex(
    (record) => record.id === input.notificationId && record.clinicId === input.clinicId,
  );
  if (index === -1) {
    return { ok: false, code: "NOTIFICATION_NOT_FOUND", message: "Notification not found.", status: 404 };
  }

  const current = store[index];
  const updated: NotificationRecord = {
    ...current,
    status: "FAILED",
    errorMessage: input.errorMessage.trim() || "Unknown notification error",
  };
  store[index] = updated;
  return { ok: true, data: clone(updated) };
}

export function listNotificationsForClinic(input: {
  clinicId: string;
  patientId?: string | null;
  appointmentId?: string | null;
  channel?: NotificationChannel;
  type?: NotificationType;
}) {
  const items = getNotificationStore()
    .filter((record) => record.clinicId === input.clinicId)
    .filter((record) => (input.patientId ? record.patientId === input.patientId : true))
    .filter((record) => (input.appointmentId ? record.appointmentId === input.appointmentId : true))
    .filter((record) => (input.channel ? record.channel === input.channel : true))
    .filter((record) => (input.type ? record.type === input.type : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return clone(items);
}

export function getDailyNotificationCap() {
  return DAILY_NOTIFICATION_CAP;
}

export function resetNotificationStoresForTests() {
  getNotificationStore().length = 0;
  getNotificationIdempotencyStore().clear();
}

export async function sendEmailNotificationForClinic(
  input: EmailDeliveryPayload,
): Promise<NotificationServiceResult<EmailDeliveryResult>> {
  const queued = queueNotificationForClinic({
    clinicId: input.clinicId,
    type: input.type,
    channel: "EMAIL",
    appointmentId: input.appointmentId,
    patientId: input.patientId,
    recipientEmail: input.recipientEmail,
    idempotencyKey: input.idempotencyKey ?? null,
    metadata: input.metadata ?? null,
  });
  if (!queued.ok) return queued;

  if (queued.data.replayed) {
    return {
      ok: true,
      data: {
        notification: queued.data.notification,
        replayed: true,
        provider: "resend-fallback",
        providerMessageId: null,
      },
    };
  }

  const from =
    input.from?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Healio Notifications <notifications@healio.local>";
  try {
    const delivery = await sendEmailWithResend({
      from,
      to: input.recipientEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    const sent = markNotificationSentForClinic({
      clinicId: input.clinicId,
      notificationId: queued.data.notification.id,
    });
    if (!sent.ok) return sent;
    return {
      ok: true,
      data: {
        notification: sent.data,
        replayed: false,
        provider: delivery.provider,
        providerMessageId: delivery.id,
      },
    };
  } catch (error) {
    const failed = markNotificationFailedForClinic({
      clinicId: input.clinicId,
      notificationId: queued.data.notification.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    if (!failed.ok) return failed;
    return {
      ok: false,
      code: "NOTIFICATION_DELIVERY_FAILED",
      message: "Email notification could not be sent.",
      status: 502,
      details: {
        notificationId: failed.data.id,
        error: failed.data.errorMessage,
      },
    };
  }
}

export async function sendInvoiceEmailNotificationForClinic(
  input: InvoiceEmailDeliveryPayload,
): Promise<NotificationServiceResult<InvoiceEmailDeliveryResult>> {
  const delivery = await sendEmailNotificationForClinic({
    clinicId: input.clinicId,
    type: "INVOICE_SENT",
    patientId: input.patientId,
    recipientEmail: input.patientEmail,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: process.env.RESEND_FROM_EMAIL?.trim() || "Healio Billing <billing@healio.local>",
    idempotencyKey: input.idempotencyKey ?? `invoice-send:${input.invoiceId}`,
    metadata: {
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
    },
  });
  if (!delivery.ok) {
    return {
      ok: false,
      code: delivery.code,
      message: "Invoice email could not be sent.",
      status: delivery.status,
      details: delivery.details,
    };
  }
  return {
    ok: true,
    data: {
      notification: delivery.data.notification,
      replayed: delivery.data.replayed,
      provider: delivery.data.provider,
      providerMessageId: delivery.data.providerMessageId,
    },
  };
}

export async function sendSmsNotificationForClinic(
  input: SmsDeliveryPayload,
): Promise<NotificationServiceResult<SmsDeliveryResult>> {
  const queued = queueNotificationForClinic({
    clinicId: input.clinicId,
    type: input.type,
    channel: "SMS",
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    recipientPhone: input.recipientPhone,
    idempotencyKey: input.idempotencyKey ?? null,
    metadata: input.metadata ?? null,
  });
  if (!queued.ok) return queued;

  if (queued.data.replayed) {
    return {
      ok: true,
      data: {
        notification: queued.data.notification,
        replayed: true,
        provider: "twilio-fallback",
        providerMessageId: null,
      },
    };
  }

  try {
    const delivery = await sendSmsWithTwilio({
      to: input.recipientPhone,
      body: input.body,
    });
    const sent = markNotificationSentForClinic({
      clinicId: input.clinicId,
      notificationId: queued.data.notification.id,
    });
    if (!sent.ok) return sent;
    return {
      ok: true,
      data: {
        notification: sent.data,
        replayed: false,
        provider: delivery.provider,
        providerMessageId: delivery.sid,
      },
    };
  } catch (error) {
    const failed = markNotificationFailedForClinic({
      clinicId: input.clinicId,
      notificationId: queued.data.notification.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    if (!failed.ok) return failed;
    return {
      ok: false,
      code: "NOTIFICATION_DELIVERY_FAILED",
      message: "SMS notification could not be sent.",
      status: 502,
      details: {
        notificationId: failed.data.id,
        error: failed.data.errorMessage,
      },
    };
  }
}

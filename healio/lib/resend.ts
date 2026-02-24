import crypto from "node:crypto";

export type ResendEmailRequest = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type ResendEmailResult = {
  provider: "resend" | "resend-fallback";
  id: string;
};

function normalizeToList(to: string | string[]) {
  return Array.isArray(to) ? to : [to];
}

export async function sendEmailWithResend(input: ResendEmailRequest): Promise<ResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      provider: "resend-fallback",
      id: `re_mock_${crypto.randomUUID().replaceAll("-", "")}`,
    };
  }

  let ResendCtor: any;
  try {
    const resendModule = await (0, eval)(`import("resend")`);
    ResendCtor = resendModule.Resend;
  } catch {
    return {
      provider: "resend-fallback",
      id: `re_mock_${crypto.randomUUID().replaceAll("-", "")}`,
    };
  }

  const client = new ResendCtor(apiKey);
  const result = await client.emails.send({
    from: input.from,
    to: normalizeToList(input.to),
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  const id = result?.data?.id;
  if (!id) {
    throw new Error("Resend email send did not return an id.");
  }

  return { provider: "resend", id };
}

import crypto from "node:crypto";

export type TwilioSmsRequest = {
  to: string;
  body: string;
  from?: string;
};

export type TwilioSmsResult = {
  provider: "twilio" | "twilio-fallback";
  sid: string;
};

export async function sendSmsWithTwilio(input: TwilioSmsRequest): Promise<TwilioSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = input.from?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    return {
      provider: "twilio-fallback",
      sid: `SM_mock_${crypto.randomUUID().replaceAll("-", "")}`,
    };
  }

  let twilioFactory: any;
  try {
    const module = await (0, eval)(`import("twilio")`);
    twilioFactory = module.default ?? module;
  } catch {
    return {
      provider: "twilio-fallback",
      sid: `SM_mock_${crypto.randomUUID().replaceAll("-", "")}`,
    };
  }

  const client = twilioFactory(accountSid, authToken);
  const result = await client.messages.create({
    to: input.to,
    from: fromNumber,
    body: input.body,
  });

  const sid = result?.sid;
  if (!sid) {
    throw new Error("Twilio SMS send did not return a sid.");
  }

  return { provider: "twilio", sid };
}

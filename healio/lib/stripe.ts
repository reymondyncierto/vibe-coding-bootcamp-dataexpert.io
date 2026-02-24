import crypto from "node:crypto";

export type StripeCheckoutSessionRequest = {
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  amountCents: number;
  customerReference: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type StripeCheckoutSessionResult = {
  provider: "stripe" | "stripe-fallback";
  sessionId: string;
  checkoutUrl: string;
};

function normalizeBaseUrl(input?: string | null) {
  const raw = input?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function fallbackCheckoutSession(input: StripeCheckoutSessionRequest): StripeCheckoutSessionResult {
  const sessionId = `cs_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const base = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const checkoutUrl = `${base}/payments/mock-checkout?session_id=${encodeURIComponent(sessionId)}&invoiceId=${encodeURIComponent(input.invoiceId)}`;
  return {
    provider: "stripe-fallback",
    sessionId,
    checkoutUrl,
  };
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutSessionRequest,
): Promise<StripeCheckoutSessionResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return fallbackCheckoutSession(input);
  }

  let StripeCtor: any;
  try {
    const stripeModule = await (0, eval)(`import("stripe")`);
    StripeCtor = stripeModule.default;
  } catch {
    return fallbackCheckoutSession(input);
  }

  const stripe = new StripeCtor(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.customerReference,
    metadata: {
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      ...(input.metadata ?? {}),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          product_data: {
            name: `Invoice ${input.invoiceNumber}`,
            description: `Healio invoice payment for ${input.invoiceId}`,
          },
        },
      },
    ],
  });

  if (!session.url || !session.id) {
    throw new Error("Stripe checkout session did not return url/id.");
  }

  return {
    provider: "stripe",
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

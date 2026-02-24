import { z } from "zod";

import type { SubscriptionFeature, SubscriptionPlan } from "@/lib/feature-flags";
import { createStripeCheckoutSession } from "@/lib/stripe";
import { isFeatureEnabledForPlan, listPlanFeatures } from "@/lib/feature-flags";

export const subscriptionCheckoutRequestSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "PRO"]),
});

export type SubscriptionCheckoutRequest = z.infer<typeof subscriptionCheckoutRequestSchema>;

export type ClinicSubscriptionRecord = {
  clinicId: string;
  plan: SubscriptionPlan;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE";
  billingProvider: "stripe" | "stripe-fallback" | null;
  stripeCheckoutUrl: string | null;
  stripeSubscriptionId: string | null;
  pendingUpgradePlan: SubscriptionPlan | null;
  updatedAt: string;
};

type Store = Map<string, ClinicSubscriptionRecord>;

function getStore(): Store {
  const globalScope = globalThis as typeof globalThis & { __healioSubscriptionStore?: Store };
  if (!globalScope.__healioSubscriptionStore) {
    globalScope.__healioSubscriptionStore = new Map();
  }
  return globalScope.__healioSubscriptionStore;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultRecord(clinicId: string): ClinicSubscriptionRecord {
  return {
    clinicId,
    plan: "STARTER",
    status: "ACTIVE",
    billingProvider: null,
    stripeCheckoutUrl: null,
    stripeSubscriptionId: null,
    pendingUpgradePlan: null,
    updatedAt: nowIso(),
  };
}

export function getClinicSubscription(clinicId: string): ClinicSubscriptionRecord {
  const store = getStore();
  if (!store.has(clinicId)) store.set(clinicId, defaultRecord(clinicId));
  return structuredClone(store.get(clinicId)!);
}

export function listSubscriptionPlanCatalog() {
  return [
    { plan: "STARTER" as const, label: "Starter", monthlyPrice: 49, highlights: ["Public booking", "Basic billing"] },
    { plan: "GROWTH" as const, label: "Growth", monthlyPrice: 129, highlights: ["SMS reminders", "Analytics", "Automation"] },
    { plan: "PRO" as const, label: "Pro", monthlyPrice: 249, highlights: ["Audit logs", "Advanced controls", "Priority support"] },
  ].map((plan) => ({ ...plan, features: listPlanFeatures(plan.plan) }));
}

export function canAccessFeature(clinicId: string, feature: SubscriptionFeature) {
  const subscription = getClinicSubscription(clinicId);
  return isFeatureEnabledForPlan(subscription.plan, feature);
}

export async function createSubscriptionCheckoutForClinic(input: {
  clinicId: string;
  targetPlan: SubscriptionPlan;
  requestOrigin: string;
}) {
  const store = getStore();
  const current = getClinicSubscription(input.clinicId);

  if (current.plan === input.targetPlan) {
    return {
      ok: false as const,
      code: "PLAN_ALREADY_ACTIVE",
      message: `Clinic is already on the ${input.targetPlan} plan.`,
      status: 409,
    };
  }

  const priceByPlan: Record<SubscriptionPlan, number> = {
    STARTER: 4900,
    GROWTH: 12900,
    PRO: 24900,
  };

  const checkout = await createStripeCheckoutSession({
    invoiceId: `sub_${input.clinicId}_${input.targetPlan.toLowerCase()}`,
    invoiceNumber: `SUB-${input.targetPlan}`,
    currency: "PHP",
    amountCents: priceByPlan[input.targetPlan],
    customerReference: input.clinicId,
    successUrl: `${input.requestOrigin}/settings/billing?upgrade=success&plan=${input.targetPlan}`,
    cancelUrl: `${input.requestOrigin}/settings/billing?upgrade=cancelled`,
    metadata: {
      checkoutType: "subscription-upgrade",
      clinicId: input.clinicId,
      targetPlan: input.targetPlan,
    },
  });

  const updated: ClinicSubscriptionRecord = {
    ...current,
    billingProvider: checkout.provider,
    stripeCheckoutUrl: checkout.checkoutUrl,
    pendingUpgradePlan: input.targetPlan,
    updatedAt: nowIso(),
  };
  store.set(input.clinicId, updated);

  return {
    ok: true as const,
    data: {
      subscription: structuredClone(updated),
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      provider: checkout.provider,
    },
  };
}

export function resetSubscriptionStoreForTests() {
  getStore().clear();
}

"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiFailure, ApiSuccess } from "@/lib/api-helpers";
import { listPlanFeatures, type SubscriptionPlan } from "@/lib/feature-flags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SubscriptionRecord = {
  clinicId: string;
  plan: SubscriptionPlan;
  status: string;
  billingProvider: string | null;
  stripeCheckoutUrl: string | null;
  pendingUpgradePlan: SubscriptionPlan | null;
  updatedAt: string;
};

type PlanCatalogItem = {
  plan: SubscriptionPlan;
  label: string;
  monthlyPrice: number;
  highlights: string[];
};

type CheckoutResponse = {
  checkoutUrl: string;
  provider: string;
  sessionId: string;
  subscription: SubscriptionRecord;
};

function localAuthHeaders() {
  if (typeof window === "undefined") return {} as HeadersInit;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocal) return {};
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_owner_1",
    "x-healio-role": "OWNER",
  };
}

export default function SettingsBillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/subscription/checkout", {
          headers: { ...localAuthHeaders() },
          cache: "no-store",
        });
        const json = (await response.json()) as ApiSuccess<{ subscription: SubscriptionRecord; plans: PlanCatalogItem[] }> | ApiFailure;
        if (!response.ok || !json.success) {
          setError(!json.success ? json.error.message : "Unable to load subscription.");
          return;
        }
        if (cancelled) return;
        setSubscription(json.data.subscription);
        setPlans(json.data.plans);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load subscription.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const featurePreview = useMemo(() => {
    const plan = subscription?.pendingUpgradePlan ?? subscription?.plan ?? "STARTER";
    return listPlanFeatures(plan);
  }, [subscription]);

  async function startUpgrade(plan: SubscriptionPlan) {
    setCheckoutLoadingPlan(plan);
    setError(null);
    try {
      const response = await fetch("/api/v1/subscription/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", ...localAuthHeaders() },
        body: JSON.stringify({ plan }),
      });
      const json = (await response.json()) as ApiSuccess<CheckoutResponse> | ApiFailure;
      if (!response.ok || !json.success) {
        setError(!json.success ? json.error.message : "Unable to start checkout.");
        return;
      }
      setSubscription(json.data.subscription);
      if (typeof window !== "undefined") {
        window.open(json.data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start checkout.");
    } finally {
      setCheckoutLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Billing &amp; Subscription</h1>
        <p className="mt-2 text-sm text-muted">Manage plan access, protected feature gates, and upgrade checkout without leaving the settings workspace.</p>
      </header>

      {error ? <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>Stripe-style upgrade workflow opens secure checkout in a new tab while keeping admins on this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-6 w-36" /><Skeleton className="h-20 w-full" /></div>
            ) : subscription ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary">{subscription.plan}</Badge>
                  <Badge variant={subscription.status === "ACTIVE" ? "success" : "warning"}>{subscription.status}</Badge>
                  {subscription.pendingUpgradePlan ? <Badge variant="warning">Pending {subscription.pendingUpgradePlan}</Badge> : null}
                </div>
                <div className="rounded-card border border-border bg-app/50 p-4 text-sm text-muted">
                  <p>Clinic: <span className="font-medium text-ink">{subscription.clinicId}</span></p>
                  <p className="mt-1">Billing provider: <span className="font-medium text-ink">{subscription.billingProvider ?? "Not connected"}</span></p>
                  <p className="mt-1">Last updated: <span className="font-medium text-ink">{new Date(subscription.updatedAt).toLocaleString()}</span></p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {plans.map((plan) => {
                    const isCurrent = subscription.plan === plan.plan;
                    return (
                      <div key={plan.plan} className="rounded-card border border-border bg-white p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-sm font-semibold text-ink">{plan.label}</h2>
                          <span className="text-sm font-semibold text-ink">₱{plan.monthlyPrice}/mo</span>
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-muted">
                          {plan.highlights.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                        <Button
                          className="mt-3 w-full"
                          variant={isCurrent ? "secondary" : "primary"}
                          disabled={isCurrent}
                          loading={checkoutLoadingPlan === plan.plan}
                          onClick={() => startUpgrade(plan.plan)}
                        >
                          {isCurrent ? "Current Plan" : `Upgrade to ${plan.label}`}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-card border border-border bg-app/50 p-4 text-sm text-muted">No subscription data available.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature access preview</CardTitle>
            <CardDescription>Preview guards for the active or pending plan to understand what unlocks after checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              featurePreview.map((feature) => (
                <div key={feature.feature} className="flex items-center justify-between rounded-card border border-border bg-app/40 px-3 py-2 text-sm">
                  <span className="font-medium text-ink">{feature.feature.replaceAll("_", " ")}</span>
                  <Badge variant={feature.enabled ? "success" : "neutral"}>{feature.enabled ? "Enabled" : "Locked"}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { ApiFailure, ApiSuccess } from "@/lib/api-helpers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";

type ProvisionSuccess = {
  replayed: boolean;
  clinic: { name: string; slug: string };
  authContext: { clinicId: string; userId: string; role: string };
  onboarding: { nextPath: string; recommendedSteps: string[] };
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: ProvisionSuccess }
  | { kind: "error"; message: string };

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthPageFallback title="Preparing signup..." />}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/settings";
  }, [searchParams]);

  const [form, setForm] = useState({
    fullName: "Dr. Samantha Lim",
    email: "samantha.lim@example.com",
    clinicName: "Samantha Lim Family Clinic",
    clinicSlug: "lim-family-clinic",
    timezone: "Asia/Manila",
    currency: "PHP",
  });
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [magicLinkState, setMagicLinkState] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitProvisioning(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitState({ kind: "loading" });
    try {
      const response = await fetch("/api/auth/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "signup",
        }),
      });
      const json = (await response.json()) as ApiSuccess<ProvisionSuccess> | ApiFailure;
      if (!response.ok || !json.success) {
        setSubmitState({ kind: "error", message: !json.success ? json.error.message : "Provisioning failed." });
        return;
      }
      setSubmitState({ kind: "success", data: json.data });
      pushToast({
        title: json.data.replayed ? "Clinic provisioning reused" : "Clinic provisioned",
        description: `${json.data.clinic.name} is ready for onboarding settings.`,
        variant: "success",
      });
    } catch (error) {
      setSubmitState({ kind: "error", message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  async function sendMagicLink() {
    setMagicLinkState({ kind: "loading" });
    try {
      const supabase = getSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: { emailRedirectTo: callbackUrl.toString() },
      });
      if (error) {
        setMagicLinkState({ kind: "error", message: error.message });
        return;
      }
      setMagicLinkState({ kind: "success", message: "Magic link sent. After verification, return to login and continue to your clinic." });
    } catch (error) {
      setMagicLinkState({
        kind: "error",
        message: error instanceof Error ? `Supabase auth unavailable: ${error.message}` : "Supabase auth unavailable.",
      });
    }
  }

  async function continueWithGoogle() {
    try {
      const supabase = getSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) {
        pushToast({
          title: "Google sign-up unavailable",
          description: error.message,
          variant: "error",
        });
      }
    } catch (error) {
      pushToast({
        title: "Supabase auth unavailable",
        description: error instanceof Error ? error.message : "OAuth not configured in this environment.",
        variant: "error",
      });
    }
  }

  return (
    <div className="min-h-screen bg-app px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="border-b border-border/70 bg-white/90">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Clinic Onboarding</p>
                <CardTitle className="mt-2 text-2xl">Create your Healio clinic workspace</CardTitle>
                <CardDescription className="mt-1">
                  One screen to capture owner + clinic details, then provision a ready-to-configure settings workspace.
                </CardDescription>
              </div>
              <Badge variant="success">Provisioning Flow</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form className="space-y-5" onSubmit={submitProvisioning}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-ink">
                  Owner name
                  <Input
                    className="mt-1"
                    name="fullName"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(e) => patch("fullName", e.currentTarget.value)}
                    placeholder="Dr. Samantha Lim"
                  />
                </label>
                <label className="text-sm font-medium text-ink">
                  Owner email
                  <Input
                    className="mt-1"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => patch("email", e.currentTarget.value)}
                    placeholder="doctor@clinic.com"
                  />
                </label>
                <label className="text-sm font-medium text-ink sm:col-span-2">
                  Clinic name
                  <Input
                    className="mt-1"
                    name="clinicName"
                    autoComplete="organization"
                    value={form.clinicName}
                    onChange={(e) => patch("clinicName", e.currentTarget.value)}
                    placeholder="Sunrise Family Clinic"
                  />
                </label>
                <label className="text-sm font-medium text-ink">
                  Booking slug
                  <Input
                    className="mt-1"
                    name="clinicSlug"
                    value={form.clinicSlug}
                    onChange={(e) => patch("clinicSlug", e.currentTarget.value)}
                    placeholder="sunrise-family-clinic"
                  />
                </label>
                <label className="text-sm font-medium text-ink">
                  Timezone
                  <Input
                    className="mt-1"
                    name="timezone"
                    value={form.timezone}
                    onChange={(e) => patch("timezone", e.currentTarget.value)}
                    placeholder="Asia/Manila"
                  />
                </label>
                <label className="text-sm font-medium text-ink sm:max-w-[220px]">
                  Currency
                  <Select
                    className="mt-1"
                    name="currency"
                    value={form.currency}
                    onChange={(e) => patch("currency", e.currentTarget.value)}
                  >
                    <option value="PHP">PHP</option>
                    <option value="USD">USD</option>
                  </Select>
                </label>
              </div>

              <div className="rounded-card border border-border bg-white p-4 text-sm">
                <p className="font-medium text-ink">What happens on submit</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  <li>POST to <code>/api/auth/provision</code> creates or reuses a clinic provisioning record.</li>
                  <li>Clinic settings are initialized so the Settings page has real data on first load.</li>
                  <li>The response includes an onboarding next step path and recommended setup actions.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={submitState.kind === "loading"} className="sm:min-w-[220px]">
                  {submitState.kind === "loading" ? "Provisioning..." : "Create Account & Provision Clinic"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void sendMagicLink()} disabled={magicLinkState.kind === "loading"}>
                  {magicLinkState.kind === "loading" ? "Sending..." : "Send Magic Link (Optional)"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void continueWithGoogle()}>
                  Continue with Google
                </Button>
                <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="sm:ml-auto">
                  <Button type="button" variant="ghost">Back to Login</Button>
                </Link>
              </div>
            </form>

            {submitState.kind === "error" ? (
              <div className="mt-4 rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{submitState.message}</div>
            ) : null}
            {magicLinkState.kind === "success" ? (
              <div className="mt-4 rounded-card border border-success/20 bg-success/5 p-3 text-sm text-success">{magicLinkState.message}</div>
            ) : null}
            {magicLinkState.kind === "error" ? (
              <div className="mt-4 rounded-card border border-warning/20 bg-warning/5 p-3 text-sm text-warning">{magicLinkState.message}</div>
            ) : null}

            {submitState.kind === "success" ? (
              <div className="mt-5 rounded-card border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={submitState.data.replayed ? "warning" : "success"}>
                    {submitState.data.replayed ? "Provisioning Reused" : "Provisioning Created"}
                  </Badge>
                  <Badge variant="primary">{submitState.data.authContext.role}</Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">{submitState.data.clinic.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  Clinic ID: <code>{submitState.data.authContext.clinicId}</code> • Booking slug: <code>{submitState.data.clinic.slug}</code>
                </p>
                <div className="mt-3 rounded-card border border-border bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recommended next steps</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                    {submitState.data.onboarding.recommendedSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={submitState.data.onboarding.nextPath}>
                    <Button>Continue to Settings Onboarding</Button>
                  </Link>
                  <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
                    <Button variant="secondary">Open Login</Button>
                  </Link>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frictionless setup</CardTitle>
              <CardDescription>
                Healio keeps setup in one calm page so clinic owners can finish onboarding without tab-hopping.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-card border border-border bg-white p-4 text-sm">
                <p className="font-medium text-ink">Stripe-style workflow</p>
                <p className="mt-1 text-muted">Provisioning runs in-place and returns a next-step handoff instead of redirecting to a blank admin screen.</p>
              </div>
              <div className="rounded-card border border-border bg-white p-4 text-sm">
                <p className="font-medium text-ink">Viedoc-style clarity</p>
                <p className="mt-1 text-muted">Bento cards summarize what gets provisioned and what the owner should configure first.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Callback readiness</CardTitle>
              <CardDescription>Magic links and OAuth redirects return through the local callback endpoint before routing to the requested page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted">
              <p><code>/auth/callback</code> safely validates the `next` path and redirects back to login on provider errors.</p>
              <p>This signup page can still provision locally for implementation/testing even if Supabase isn&apos;t available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AuthPageFallback({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-app px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Loading onboarding form state and redirect parameters.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">Please wait a moment…</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

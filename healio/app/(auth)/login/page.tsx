"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { ApiFailure, ApiSuccess } from "@/lib/api-helpers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";

type MagicLinkState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type ProvisionLookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; clinicName: string; nextPath: string; replayed: boolean }
  | { kind: "error"; message: string };

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/settings";
  }, [searchParams]);
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("owner@northview.example.com");
  const [fullName, setFullName] = useState("Dr. Andrea Reyes");
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>({ kind: "idle" });
  const [lookupState, setLookupState] = useState<ProvisionLookupState>({ kind: "idle" });

  async function sendMagicLink() {
    setMagicLinkState({ kind: "loading" });
    try {
      const supabase = getSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl.toString() },
      });
      if (error) {
        setMagicLinkState({ kind: "error", message: error.message });
        return;
      }
      setMagicLinkState({
        kind: "success",
        message: "Magic link sent. After email verification, Supabase will redirect back through /auth/callback.",
      });
    } catch (error) {
      setMagicLinkState({
        kind: "error",
        message:
          error instanceof Error
            ? `Supabase auth unavailable in this environment: ${error.message}`
            : "Supabase auth unavailable in this environment.",
      });
    }
  }

  async function localProvisionPreview() {
    setLookupState({ kind: "loading" });
    try {
      const response = await fetch("/api/auth/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          clinicName: "Northview Clinic",
          clinicSlug: "northview-clinic",
          source: "manual",
        }),
      });
      const json = (await response.json()) as ApiSuccess<any> | ApiFailure;
      if (!response.ok || !json.success) {
        setLookupState({
          kind: "error",
          message: !json.success ? json.error.message : "Provision lookup failed.",
        });
        return;
      }
      setLookupState({
        kind: "success",
        clinicName: json.data.clinic.name,
        nextPath: json.data.onboarding.nextPath,
        replayed: Boolean(json.data.replayed),
      });
      pushToast({
        title: "Provisioning preview ready",
        description: "Local-safe provisioning completed so you can inspect the onboarding handoff.",
        variant: "success",
      });
    } catch (error) {
      setLookupState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
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
        pushToast({ title: "Google sign-in unavailable", description: error.message, variant: "error" });
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
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-white/90">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Healio Access</p>
                <CardTitle className="mt-2 text-2xl">Welcome back</CardTitle>
                <CardDescription className="mt-1">
                  Sign in with a magic link or OAuth, then continue to your clinic workspace without losing context.
                </CardDescription>
              </div>
              <Badge variant="primary">Auth Flow</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 sm:p-6">
            {callbackError ? (
              <div className="rounded-card border border-warning/20 bg-warning/5 p-3 text-sm text-warning">
                Callback returned <strong>{callbackError}</strong>. You can retry sign-in below.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Next after sign-in</p>
                <p className="mt-1 text-sm font-medium text-ink">{nextPath}</p>
                <p className="mt-2 text-xs text-muted">Supabase callbacks resolve through <code>/auth/callback</code>.</p>
              </div>
              <div className="rounded-card border border-border bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Fast local preview</p>
                <p className="mt-1 text-sm text-muted">
                  Use the preview action to exercise the provisioning handoff even when Supabase isn&apos;t configured.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-card border border-border bg-white p-4">
              <label className="block text-sm font-medium text-ink">
                Work email
                <Input
                  className="mt-1"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  placeholder="doctor@clinic.com"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Display name (for local preview)
                <Input
                  className="mt-1"
                  name="full-name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.currentTarget.value)}
                  placeholder="Dr. Andrea Reyes"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => void sendMagicLink()} disabled={magicLinkState.kind === "loading"}>
                  {magicLinkState.kind === "loading" ? "Sending..." : "Send Magic Link"}
                </Button>
                <Button variant="secondary" onClick={() => void continueWithGoogle()}>
                  Continue with Google
                </Button>
              </div>
              <Button variant="ghost" onClick={() => void localProvisionPreview()} disabled={lookupState.kind === "loading"}>
                {lookupState.kind === "loading" ? "Preparing..." : "Preview Provisioning Handoff"}
              </Button>
            </div>

            {magicLinkState.kind === "success" ? (
              <div className="rounded-card border border-success/20 bg-success/5 p-3 text-sm text-success">{magicLinkState.message}</div>
            ) : null}
            {magicLinkState.kind === "error" ? (
              <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{magicLinkState.message}</div>
            ) : null}

            {lookupState.kind === "success" ? (
              <div className="rounded-card border border-primary/20 bg-primary/5 p-4 text-sm">
                <p className="font-medium text-ink">Provisioning handoff ready for {lookupState.clinicName}</p>
                <p className="mt-1 text-muted">
                  {lookupState.replayed ? "Existing clinic provisioning was reused." : "A new clinic provisioning record was created."}
                </p>
                <Link href={lookupState.nextPath} className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                  Continue to onboarding settings
                </Link>
              </div>
            ) : null}
            {lookupState.kind === "error" ? (
              <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{lookupState.message}</div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New clinic owner?</CardTitle>
              <CardDescription>
                Create your account and provision your clinic in one flow, then land in Settings to configure hours and services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-card border border-dashed border-border bg-app/50 p-4 text-sm">
                <p className="font-medium text-ink">Paper-to-digital onboarding</p>
                <p className="mt-1 text-muted">
                  Healio starts with a guided setup so a solo practitioner can configure clinic profile, hours, and services quickly.
                </p>
              </div>
              <Link href="/signup" className="inline-flex w-full">
                <Button className="w-full">Create Clinic Account</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Callback Path</CardTitle>
              <CardDescription>
                Supabase OAuth and magic-link redirects return through a local callback handler before continuing to the selected page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted">
              <p><code>/auth/callback</code> exchanges the auth code for a session and redirects to the safe `next` path.</p>
              <p>Fallback behavior gracefully returns to login with an error query if the provider is unavailable.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

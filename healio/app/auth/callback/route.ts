import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(input: string | null) {
  if (!input) return "/settings";
  if (!input.startsWith("/") || input.startsWith("//")) return "/settings";
  return input;
}

function redirectWithError(requestUrl: URL, message: string, nextPath: string) {
  const loginUrl = new URL("/auth/login", requestUrl);
  loginUrl.searchParams.set("next", nextPath);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const errorCode = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (errorCode) {
    return redirectWithError(url, errorCode, nextPath);
  }

  if (!code) {
    return redirectWithError(url, "missing_code", nextPath);
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectWithError(url, "exchange_failed", nextPath);
    }
    return NextResponse.redirect(new URL(nextPath, url));
  } catch {
    return redirectWithError(url, "supabase_not_configured", nextPath);
  }
}


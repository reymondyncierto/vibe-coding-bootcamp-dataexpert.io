import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import {
  parseHealioAuthContextFromUser,
  type HealioAuthContext,
} from "@/lib/supabase/auth-claims";

type CookieWrite = { name: string; value: string; options?: Record<string, unknown> };

export function tryParseHealioAuthContext(user: User | null): HealioAuthContext | null {
  if (!user) return null;
  try {
    return parseHealioAuthContextFromUser(user);
  } catch {
    return null;
  }
}

export async function updateSupabaseSession(request: NextRequest) {
  const env = getPublicEnv();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookieList: CookieWrite[]) {
          for (const cookie of cookieList) {
            request.cookies.set(cookie.name, cookie.value);
          }

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          for (const cookie of cookieList) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    response,
    user,
    authContext: tryParseHealioAuthContext(user),
  };
}

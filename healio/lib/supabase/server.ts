import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";
import {
  parseHealioAuthContextFromUser,
  type HealioAuthContext,
} from "@/lib/supabase/auth-claims";
type CookieWrite = { name: string; value: string; options?: Record<string, unknown> };

export function createSupabaseServerClient() {
  const env = getPublicEnv();
  const cookieStore = cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookieList: CookieWrite[]) {
          try {
            for (const cookie of cookieList) {
              cookieStore.set(cookie.name, cookie.value, cookie.options);
            }
          } catch {
            // Server Components may be read-only; middleware handles persistence.
          }
        },
      },
    },
  );
}

export async function getAuthenticatedUserOrThrow() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return user;
}

export async function getHealioAuthContextOrThrow() {
  const user = await getAuthenticatedUserOrThrow();
  return parseHealioAuthContextFromUser(user);
}

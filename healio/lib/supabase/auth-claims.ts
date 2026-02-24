import type { User } from "@supabase/supabase-js";

export type HealioRole = "OWNER" | "DOCTOR" | "RECEPTIONIST";

export interface HealioAuthContext {
  userId: string;
  email: string | null;
  clinicId: string;
  role: HealioRole;
}

export function parseHealioAuthContextFromUser(
  user: Pick<User, "id" | "email" | "app_metadata" | "user_metadata">,
): HealioAuthContext {
  const claims = {
    ...(user.app_metadata ?? {}),
    ...(user.user_metadata ?? {}),
  } as Record<string, unknown>;

  const clinicId = claims.clinicId;
  const role = claims.role;

  if (typeof clinicId !== "string" || clinicId.length < 3) {
    throw new Error("Authenticated user is missing required clinicId claim.");
  }

  if (role !== "OWNER" && role !== "DOCTOR" && role !== "RECEPTIONIST") {
    throw new Error("Authenticated user is missing a valid role claim.");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    clinicId,
    role,
  };
}

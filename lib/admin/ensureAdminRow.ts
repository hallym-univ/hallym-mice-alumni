import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function ensureAdminRow(
  admin: AdminClient,
  profileId: string,
): Promise<void> {
  const { data: existing, error: existingError } = await admin
    .from("admins")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new Error(`admin row lookup failed: ${existingError.message}`);
  }
  if (existing) return;

  const { error } = await admin.from("admins").insert({
    profile_id: profileId,
    granted_by: profileId,
  });

  if (error && error.code !== "23505") {
    throw new Error(`admin row insert failed: ${error.message}`);
  }
}

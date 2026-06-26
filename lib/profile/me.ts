import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MyProfileSource } from "@/lib/profile/visibility";

export const MY_PROFILE_COLS =
  "id,name,role,status,is_verified,student_number,admission_year,graduation_year,department,organization,employment_status,position,bio,career_summary,coffeechat_status,open_kakao_url,proposal_email_allowed,photo_path,is_public,field_visibility,created_at,updated_at";

export async function loadMyProfile(
  profileId: string,
): Promise<MyProfileSource | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(MY_PROFILE_COLS)
    .eq("id", profileId)
    .maybeSingle<MyProfileSource>();

  return data ?? null;
}

export async function loadMyTagIds(profileId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profile_tags")
    .select("tag_id")
    .eq("profile_id", profileId);

  return (data ?? []).map((row) => row.tag_id);
}

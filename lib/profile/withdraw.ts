import "server-only";

import { deleteObject } from "@/lib/storage";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

export type WithdrawnProfileSummary = Pick<
  ProfileRow,
  "id" | "name" | "role" | "status" | "is_verified"
>;

export async function anonymizeProfileForWithdrawal(
  admin: AdminClient,
  profileId: string,
  opts: { now?: string; photoPath?: string | null } = {},
): Promise<WithdrawnProfileSummary> {
  const now = opts.now ?? new Date().toISOString();
  const photoPath = opts.photoPath ?? (await loadPhotoPath(admin, profileId));

  const { data, error } = await admin
    .from("profiles")
    .update({
      name: "탈퇴한 회원",
      student_number: null,
      admission_year: null,
      graduation_year: null,
      department: null,
      organization: null,
      position: null,
      bio: null,
      career_summary: null,
      open_kakao_url: null,
      proposal_email_allowed: false,
      photo_path: null,
      coffeechat_status: "private",
      is_public: false,
      status: "withdrawn",
      anonymized_at: now,
      deleted_at: now,
      updated_at: now,
      field_visibility: {},
    })
    .eq("id", profileId)
    .select("id,name,role,status,is_verified")
    .maybeSingle<WithdrawnProfileSummary>();

  if (error || !data) {
    throw new Error(error?.message ?? "profile withdrawal anonymization failed");
  }

  await cleanupWithdrawnProfile(admin, profileId);
  if (photoPath) await deleteWithdrawnProfilePhoto(photoPath);

  return data;
}

async function loadPhotoPath(
  admin: AdminClient,
  profileId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("photo_path")
    .eq("id", profileId)
    .maybeSingle<Pick<ProfileRow, "photo_path">>();
  return data?.photo_path ?? null;
}

async function cleanupWithdrawnProfile(
  admin: AdminClient,
  profileId: string,
): Promise<void> {
  const results = await Promise.allSettled([
    admin.from("profile_tags").delete().eq("profile_id", profileId),
    admin
      .from("blocks")
      .delete()
      .or(`blocker_profile_id.eq.${profileId},blocked_profile_id.eq.${profileId}`),
    admin.from("consents").delete().eq("profile_id", profileId),
    admin.from("admins").delete().eq("profile_id", profileId),
    admin.from("notifications").delete().eq("profile_id", profileId),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[withdraw] cleanup failed", result.reason);
    } else if (result.value.error) {
      console.error("[withdraw] cleanup failed", result.value.error);
    }
  }
}

async function deleteWithdrawnProfilePhoto(photoPath: string): Promise<void> {
  try {
    await deleteObject(photoPath);
  } catch (error) {
    console.error("[withdraw] photo delete failed", error);
  }
}

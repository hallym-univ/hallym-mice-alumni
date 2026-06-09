import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toMyProfile } from "@/lib/profile/visibility";
import { profileUpdateSchema } from "@/lib/validators";
import type { ProfileRow } from "@/types/database";

/**
 * GET  /api/profiles/me  — 본인 프로필(편집용 전 필드 + field_visibility).
 * PATCH /api/profiles/me — 본인 프로필 수정(2단계 완성 포함, T-201).
 *
 * 보안(핵심): profileUpdateSchema 에 role/status/is_admin/is_verified/user_id 가
 *  "존재하지 않으므로" 클라가 보내도 파싱에서 제거된다(자기 권한 상승 차단 — §6.2).
 *  명시적 화이트리스트(아래 patch 빌더)로 한 번 더 한정한다.
 */

async function loadMyTagIds(profileId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profile_tags")
    .select("tag_id")
    .eq("profile_id", profileId);
  return (data ?? []).map((r) => r.tag_id);
}

export const GET = withAuth(
  async (_req, { me }) => {
    const tagIds = await loadMyTagIds(me.profile.id);
    return Response.json({ profile: toMyProfile(me.profile, tagIds) });
  },
  { role: "member" },
);

export const PATCH = withAuth(
  async (req, { me }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return Response.json(
        { error: "입력값을 확인해주세요.", fieldErrors },
        { status: 422 },
      );
    }

    const input = parsed.data;
    const admin = createAdminClient();

    // 명시 화이트리스트(권한 필드 일절 미포함).
    const patch: Partial<ProfileRow> = {};
    const allowed = [
      "name",
      "department",
      "admission_year",
      "graduation_year",
      "organization",
      "employment_status",
      "position",
      "bio",
      "career_summary",
      "coffeechat_status",
      "open_kakao_url",
      "proposal_email_allowed",
      "photo_path",
      "is_public",
      "field_visibility",
    ] as const;

    for (const key of allowed) {
      if (key in input && input[key] !== undefined) {
        // @ts-expect-error 화이트리스트 키만 복사(런타임 안전).
        patch[key] = input[key];
      }
    }
    patch.updated_at = new Date().toISOString();

    const { error: updateErr } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", me.profile.id);

    if (updateErr) {
      console.error("[PATCH /api/profiles/me] update", updateErr);
      return Response.json({ error: "저장에 실패했어요." }, { status: 500 });
    }

    // 태그 동기화(전달된 경우에만).
    if (input.tag_ids) {
      const { error: delErr } = await admin
        .from("profile_tags")
        .delete()
        .eq("profile_id", me.profile.id);
      if (!delErr && input.tag_ids.length > 0) {
        await admin.from("profile_tags").insert(
          input.tag_ids.map((tag_id) => ({
            profile_id: me.profile.id,
            tag_id,
          })),
        );
      }
    }

    const { data: fresh } = await admin
      .from("profiles")
      .select("*")
      .eq("id", me.profile.id)
      .single<ProfileRow>();

    const tagIds = await loadMyTagIds(me.profile.id);
    return Response.json({
      profile: fresh ? toMyProfile(fresh, tagIds) : null,
    });
  },
  { role: "member" },
);

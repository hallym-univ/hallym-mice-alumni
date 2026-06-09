import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObject } from "@/lib/storage";

/**
 * POST /api/account — 계정 동작 (§8.3 self-serve / T-108).
 *  action='hide'     : 프로필 비공개(데이터 유지, is_public=false). 되돌릴 수 있음.
 *  action='unhide'   : 프로필 공개 복원.
 *  action='withdraw' : 탈퇴/파기. 식별정보 즉시 익명화 + status='withdrawn' + anonymized_at 기록.
 *
 * 탈퇴 시:
 *  - 식별 가능한 필드(이름·학번·소속·소개·오픈카톡·사진키)를 즉시 비식별화.
 *  - events.profile_id 는 스키마상 on delete set null 이지만 여기선 프로필을 "삭제하지 않고"
 *    익명화하므로 events 는 그대로 코호트 해시로 보존된다(리텐션 유지).
 *  - 사진 R2 객체는 즉시 삭제(파기).
 *  - "비공개 vs 파기" 분리: hide 는 복구 가능, withdraw 는 익명화(비가역).
 */
export const POST = withAuth(
  async (req, { me }) => {
    let body: { action?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const admin = createAdminClient();
    const action = body.action;

    if (action === "hide" || action === "unhide") {
      const { error } = await admin
        .from("profiles")
        .update({ is_public: action === "hide" ? false : true, updated_at: new Date().toISOString() })
        .eq("id", me.profile.id);
      if (error) {
        console.error("[account hide]", error);
        return Response.json({ error: "처리에 실패했어요." }, { status: 500 });
      }
      return Response.json({ ok: true });
    }

    if (action === "withdraw") {
      const now = new Date().toISOString();
      const photoKey = me.profile.photo_path;

      const { error } = await admin
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
        .eq("id", me.profile.id);

      if (error) {
        console.error("[account withdraw]", error);
        return Response.json({ error: "탈퇴 처리에 실패했어요." }, { status: 500 });
      }

      // 연결 데이터 정리(태그·차단). consents 는 동의 입증을 위해 보존하지 않고 파기 대상.
      await admin.from("profile_tags").delete().eq("profile_id", me.profile.id);
      await admin
        .from("blocks")
        .delete()
        .or(`blocker_profile_id.eq.${me.profile.id},blocked_profile_id.eq.${me.profile.id}`);
      // consents 파기(PIPA: 탈퇴 후 동의 보유 사유 소멸).
      await admin.from("consents").delete().eq("profile_id", me.profile.id);

      // 사진 R2 객체 파기.
      if (photoKey) {
        try {
          await deleteObject(photoKey);
        } catch (e) {
          console.error("[account withdraw] photo delete", e);
        }
      }

      return Response.json({ ok: true });
    }

    return Response.json({ error: "알 수 없는 동작이에요." }, { status: 400 });
  },
  { role: "member" },
);

import { withAuth } from "@/lib/guards/withAuth";
import { anonymizeProfileForWithdrawal } from "@/lib/profile/withdraw";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountActionSchema } from "@/lib/validators";

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
 *  - 태그·차단·동의·관리자 권한·알림을 정리하고 사진 R2 객체는 즉시 삭제(파기).
 *  - "비공개 vs 파기" 분리: hide 는 복구 가능, withdraw 는 익명화(비가역).
 */
export const POST = withAuth(
  async (req, { me }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const parsed = accountActionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "알 수 없는 동작이에요." },
        { status: 422 },
      );
    }

    const admin = createAdminClient();
    const action = parsed.data.action;

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
      try {
        await anonymizeProfileForWithdrawal(admin, me.profile.id, {
          now,
          photoPath: me.profile.photo_path,
        });
      } catch (error) {
        console.error("[account withdraw]", error);
        return Response.json({ error: "탈퇴 처리에 실패했어요." }, { status: 500 });
      }

      return Response.json({ ok: true });
    }

    return Response.json({ error: "알 수 없는 동작이에요." }, { status: 400 });
  },
  { role: "member" },
);

import "server-only";

import { redirect } from "next/navigation";

import { requireMember } from "@/lib/guards/requireMember";
import { AuthError, type AuthContext } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

/**
 * (app) Server Component 용 회원 가드 헬퍼.
 *
 * requireMember() 의 AuthError 를 상황별 리다이렉트로 변환한다:
 *  - 401(미로그인)        → /login?next=...
 *  - 403 + 프로필 없음     → /onboarding (가입 미완료)
 *  - 403 + suspended/withdrawn → /login?blocked=1 (이용 제한 — 앱 진입 불가)
 *
 * 미들웨어가 1차로 막지만, 정밀 권한(active 여부)은 여기서 2차로 강제한다.
 */
export async function requireMemberPage(nextPath: string): Promise<AuthContext> {
  try {
    return await requireMember();
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.status === 401) {
        redirect(`/login?next=${encodeURIComponent(nextPath)}`);
      }
      // 403: 프로필 유무로 분기.
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!profile) redirect("/onboarding");
      }
      redirect("/login?blocked=1");
    }
    throw err;
  }
}

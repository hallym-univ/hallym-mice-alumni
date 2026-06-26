import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth 콜백 (§6.1).
 * Google 로그인 후 돌아오는 지점. authorization code 를 세션으로 교환하고,
 * 프로필 유무(user_metadata.has_profile)에 따라 온보딩/next 로 보낸다.
 *
 * 주의: 이 라우트는 세션 쿠키 교환만 하며, 미들웨어가 이후 라우팅을 2차 보정한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = normalizeInternalNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const hasProfile = Boolean(user?.user_metadata?.has_profile);
      const dest = hasProfile ? next : "/onboarding";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  // 실패 시 로그인으로(에러 표시는 feature 단계).
  return NextResponse.redirect(`${origin}/login?error=auth`);
}

function normalizeInternalNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";

  try {
    const url = new URL(value, "http://internal.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/home";
  }
}

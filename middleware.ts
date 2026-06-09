import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

/**
 * middleware (§9.4):
 *  1) @supabase/ssr 세션 리프레시(토큰 갱신 → 쿠키 재기록).
 *  2) 라우트 보호:
 *     - 비로그인 사용자가 보호 경로 접근 → /login 으로.
 *     - 로그인했으나 프로필 미생성 사용자 → /onboarding 으로.
 *
 * 주의: middleware 는 Edge 런타임이라 admin(service_role) 클라이언트를 쓰지 않는다.
 * 프로필 존재 여부는 user metadata 의 `has_profile` 플래그로 가볍게 판정한다.
 * (온보딩 완료 시 서버에서 supabase.auth.updateUser({ data: { has_profile: true } }) 로 세팅)
 * 정밀 권한(member/admin/suspended)은 각 서버 핸들러의 withAuth 가 2차로 강제한다.
 */

// 로그인 없이 접근 가능한 공개 경로(접두어 매칭).
const PUBLIC_PATHS = ["/", "/login", "/terms", "/privacy", "/auth"];

// 프로필이 없어도 접근 가능한 경로(온보딩/로그아웃 등).
const ONBOARDING_ALLOWED = ["/onboarding"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 리프레시(반드시 getUser 호출로 토큰 갱신 트리거).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 공개 경로는 통과.
  if (isPublicPath(pathname)) {
    return response;
  }

  // 비로그인 → /login (원래 경로를 next 쿼리로 보존)
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 로그인했으나 프로필 미생성 → /onboarding
  const hasProfile = Boolean(user.user_metadata?.has_profile);
  const isOnboardingPath = ONBOARDING_ALLOWED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!hasProfile && !isOnboardingPath) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    return NextResponse.redirect(onboardingUrl);
  }

  // 이미 프로필 있는데 온보딩 페이지로 오면 홈으로.
  if (hasProfile && isOnboardingPath) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  // 정적 파일/이미지/파비콘 제외. api 는 각 핸들러 withAuth 가 처리하므로 제외.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

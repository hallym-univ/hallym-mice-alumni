import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import type { ProfileRow } from "@/types/database";

/**
 * 서버 권한 가드 (§7.4).
 *
 *  Role:
 *   - 'any'    : 로그인만 요구(status 무관). 거의 쓰지 않는다.
 *   - 'member' : 로그인 + profiles.status === 'active'. (가입자 = 풀 사용)
 *   - 'admin'  : member 조건 + (ADMIN_EMAILS 부트스트랩 || admins 테이블).
 *
 *  member = 세션 있음 + profiles.status === 'active' (suspended/withdrawn 차단).
 *  verified 게이트는 존재하지 않는다(is_verified 는 비차단 배지일 뿐).
 *
 *  모든 Route Handler / Server Action 은 withAuth 로 감싼다.
 *  감싸지 않으면 데이터(admin 클라이언트)에 닿지 않는 것이 기본값이다.
 */

export type Role = "any" | "member" | "admin";

/** 가드를 통과한 호출자 컨텍스트. 핸들러에 이것만 전달한다. */
export interface AuthContext {
  /** Supabase auth.users 의 user id */
  userId: string;
  email: string | null;
  profile: ProfileRow;
  isAdmin: boolean;
}

export class AuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

/** 표준 JSON 에러 응답 빌더(Route Handler 용). */
function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * 현재 세션 → profiles → 권한 판정을 수행하고 AuthContext 를 반환한다.
 * 실패 시 AuthError(401/403)를 throw 한다.
 *
 * Server Action 등 raw 컨텍스트가 필요할 때 직접 호출할 수 있다.
 */
export async function resolveAuth(role: Role): Promise<AuthContext> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError(401, "로그인이 필요합니다.");
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new AuthError(403, "프로필 조회에 실패했습니다.");
  }
  if (!profile) {
    // 로그인은 했으나 프로필 미생성(온보딩 미완료).
    throw new AuthError(403, "프로필이 없습니다. 온보딩을 완료해주세요.");
  }

  const isAdmin = await checkAdmin(profile, user.email ?? null);

  // member / admin 은 active 상태를 요구한다(suspended/withdrawn 차단).
  if (role !== "any" && profile.status !== "active") {
    throw new AuthError(403, "이용이 제한된 계정입니다.");
  }
  if (role === "admin" && !isAdmin) {
    throw new AuthError(403, "관리자 권한이 필요합니다.");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    isAdmin,
  };
}

/** ADMIN_EMAILS 부트스트랩 또는 admins 테이블 멤버십으로 관리자 판정. */
async function checkAdmin(profile: ProfileRow, email: string | null): Promise<boolean> {
  const env = getServerEnv();
  if (email && env.adminEmails.includes(email.toLowerCase())) {
    return true;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("admins")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Route Handler 래퍼.
 *
 *   export const POST = withAuth(async (req, ctx) => { ... }, { role: 'member' });
 *   // 동적 세그먼트: 제네릭에 "해결된 params 모양"을 준다(Promise 로 감싸지 않는다).
 *   export const GET  = withAuth<{ id: string }>(async (req, { me, params }) => {
 *     const { id } = await params;   // Next 15: params 는 Promise → await
 *   }, { role: 'admin' });
 *
 * 핸들러에는 검증을 통과한 AuthContext(me) 와 라우트 params(Promise) 가 전달된다.
 *
 * 반환 함수 시그니처는 Next 15 의 Route Handler 규약(`RouteContext`: `{ params: Promise<…> }`)과
 * 호환된다. 동적 세그먼트가 없는 라우트는 제네릭을 생략하고 params 를 무시하면 된다.
 */
export function withAuth<Ctx = Record<string, never>>(
  handler: (
    req: Request,
    ctx: { me: AuthContext; params: Promise<Ctx> },
  ) => Promise<Response> | Response,
  opts: { role: Role },
) {
  return async (
    req: Request,
    routeCtx: { params: Promise<Ctx> },
  ): Promise<Response> => {
    let me: AuthContext;
    try {
      me = await resolveAuth(opts.role);
    } catch (err) {
      if (err instanceof AuthError) {
        return jsonError(err.status, err.message);
      }
      return jsonError(500, "권한 확인 중 오류가 발생했습니다.");
    }
    return handler(req, { me, params: routeCtx?.params });
  };
}

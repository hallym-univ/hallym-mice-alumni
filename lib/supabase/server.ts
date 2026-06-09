import { cookies } from "next/headers";

import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * 쿠키 기반 서버 클라이언트 (anon 키, 세션 전용).
 *
 * 용도: 서버에서 현재 로그인 세션/유저를 읽는다(getUser/getSession).
 * RLS deny-all 이므로 이 클라이언트로 DB 테이블을 읽어도 0행이다.
 * 실제 데이터 접근은 lib/supabase/admin.ts(service_role)로 한다.
 *
 * 쿠키 쓰기는 Server Action / Route Handler / middleware 컨텍스트에서만 동작한다.
 * Server Component(읽기 전용)에서는 set 실패를 조용히 무시한다(Next.js 권장 패턴).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 호출된 경우 set이 불가하다.
            // middleware가 세션 리프레시를 담당하므로 무시해도 안전하다.
          }
        },
      },
    },
  );
}

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * 브라우저 클라이언트 — Auth 전용.
 *
 * 중요(보안): 이 클라이언트로 DB 테이블을 직접 query 하지 말 것(§9.4).
 * 모든 테이블은 RLS deny-all 이므로 anon 키로는 0행만 보이며,
 * 데이터 접근은 서버(Route Handler / Server Action)에서 admin 클라이언트로만 한다.
 * 여기서는 OAuth 로그인/로그아웃/세션 조회에만 사용한다.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}

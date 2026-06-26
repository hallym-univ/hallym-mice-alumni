import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/server-env";
import type { Database } from "@/types/database";

/**
 * service_role 클라이언트 — 서버 전용, RLS 우회, 단일 import 지점(§7.4 / §9.4).
 *
 * 보안 규칙(절대 준수):
 *  - 이 파일이 service_role 키를 사용하는 "유일한" 곳이다.
 *  - 상단의 `import "server-only"` 가 클라이언트 번들 포함을 막는다(빌드 에러로 차단).
 *  - ESLint no-restricted-imports 로 components/** 및 클라이언트 코드의 import를 추가 차단한다.
 *  - Route Handler 의 데이터 접근은 withAuth 로 감싼 서버 핸들러 안에서만 한다.
 *  - 프로필 생성처럼 withAuth 를 쓸 수 없는 Server Action 은 전용 서버 액션 가드를
 *    먼저 통과한 뒤에만 이 클라이언트를 사용한다.
 */

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (cached) return cached;

  const env = getServerEnv();
  cached = createSupabaseClient<Database>(
    env.supabaseUrl,
    env.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  return cached;
}

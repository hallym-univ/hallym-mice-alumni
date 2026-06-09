import "server-only";

import { resolveAuth, type AuthContext } from "@/lib/guards/withAuth";

/**
 * Server Action / Server Component 용 헬퍼.
 * 관리자(ADMIN_EMAILS 부트스트랩 또는 admins 테이블)를 보장하고 AuthContext 를 반환한다.
 * 미통과 시 AuthError(401/403)를 throw 한다.
 */
export async function requireAdmin(): Promise<AuthContext> {
  return resolveAuth("admin");
}

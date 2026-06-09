import "server-only";

import { resolveAuth, type AuthContext } from "@/lib/guards/withAuth";

/**
 * Server Action / Server Component 용 헬퍼.
 * 로그인 + status==='active' 회원을 보장하고 AuthContext 를 반환한다.
 * 미통과 시 AuthError(401/403)를 throw 한다(상위에서 처리/리다이렉트).
 */
export async function requireMember(): Promise<AuthContext> {
  return resolveAuth("member");
}

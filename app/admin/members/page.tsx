import { MembersManager } from "@/components/admin/MembersManager";

/**
 * 회원 관리 페이지 (§6.7 / T-301·302).
 * layout 의 requireAdmin 가드로 접근이 보장된다.
 * 검색·역할/상태 변경·is_verified 배지 토글(비차단).
 */
export const dynamic = "force-dynamic";

export default function AdminMembersPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">회원 관리</h1>
        <p className="text-sm text-muted-foreground">
          회원을 검색하고 역할·상태를 변경하거나 인증 배지를 부여하세요.
        </p>
      </header>
      <MembersManager />
    </section>
  );
}

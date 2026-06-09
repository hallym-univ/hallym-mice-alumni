import { ReportsManager } from "@/components/admin/ReportsManager";

/**
 * 신고 관리 페이지 (§6.7 / T-302).
 * layout 의 requireAdmin 가드로 접근이 보장된다.
 * 초기 상태 필터는 ?status= 쿼리로 받는다(대시보드 빠른 링크 연동).
 */
export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const initial = status ?? "open";

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">신고 관리</h1>
        <p className="text-sm text-muted-foreground">
          신고를 검토하고 대상 숨김·회원 정지를 처리하세요. 모든 작업은 기록됩니다.
        </p>
      </header>
      <ReportsManager initialStatus={initial} />
    </section>
  );
}

/**
 * 이용약관 (§5.2 공개 페이지). 본문은 운영진이 부록 C 템플릿으로 채운다.
 * Phase 1 기반 단계에서는 자리표시 스텁만 둔다.
 */
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-[480px] px-5 py-10">
      <h1 className="text-xl font-bold">이용약관</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        이용약관 본문은 운영진이 게시합니다(부록 C 템플릿). 가입 화면에서
        스크롤로 노출되어 동의를 수집합니다.
      </p>
    </main>
  );
}

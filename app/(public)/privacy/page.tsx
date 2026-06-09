/**
 * 개인정보 처리방침 (§5.2 / §8.3 / 부록 C). 본문은 운영진이 빈칸-채우기 템플릿으로 채운다.
 * Phase 1 기반 단계에서는 자리표시 스텁만 둔다.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[480px] px-5 py-10">
      <h1 className="text-xl font-bold">개인정보 처리방침</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        처리방침 본문은 운영진이 부록 C의 빈칸-채우기 템플릿으로 게시합니다
        (처리위탁·국외이전: Supabase / Vercel / Resend / Cloudflare R2 리전 명시 포함).
      </p>
    </main>
  );
}

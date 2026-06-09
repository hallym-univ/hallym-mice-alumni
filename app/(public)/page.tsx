import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * 랜딩 (§11.1).
 * 상단: 서비스명 + 한 줄 설명 / 스크롤: 가치 3개 / 하단 고정: 로그인 버튼.
 * 정적 페이지(로딩/에러/빈 상태 없음).
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5">
      <header className="pt-16">
        <h1 className="text-2xl font-bold tracking-tight">한림 MICE 동문</h1>
        <p className="mt-2 text-muted-foreground">
          단톡방·교수 추천으로 알음알음 모인 동문을 찾고, 커피챗·제안으로 연결되는
          실명 기반 동문 커뮤니티.
        </p>
      </header>

      <section className="mt-10 flex-1 space-y-5">
        {[
          { title: "동문 찾기", desc: "회사·직무·분야·기수로 동문을 검색하세요." },
          { title: "부담 없는 커피챗", desc: "오픈카톡으로 바로 연결하거나 이메일 제안을 보내세요." },
          { title: "실명 기반 신뢰", desc: "가입한 동문만 서로의 프로필을 봅니다." },
        ].map((v) => (
          <div key={v.title} className="rounded-lg border p-4">
            <p className="font-semibold">{v.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </section>

      <footer className="sticky bottom-0 space-y-3 bg-background py-6">
        <Button asChild size="lg" className="w-full">
          <Link href="/login">시작하기</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          시작하면{" "}
          <Link href="/terms" className="underline">
            이용약관
          </Link>{" "}
          및{" "}
          <Link href="/privacy" className="underline">
            개인정보 처리방침
          </Link>
          에 동의하게 됩니다.
        </p>
      </footer>
    </main>
  );
}

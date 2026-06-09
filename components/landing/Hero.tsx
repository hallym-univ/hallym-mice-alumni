import Link from "next/link";

import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AbstractField } from "./AbstractField";

/**
 * 랜딩 히어로 — 풀뷰포트 에디토리얼. 큰 타이포 + 코드 기반 추상 배경.
 * 진입 애니메이션은 CSS(animate-fade-up)로 마운트 시 재생(스크롤 불필요).
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden px-6">
      <AbstractField />
      <div className="relative mx-auto w-full max-w-screen-lg">
        <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Hallym MICE Alumni Network
        </p>
        <h1 className="mt-6 max-w-4xl animate-fade-up text-display-1 font-bold [animation-delay:80ms]">
          흩어진 동문을
          <br />
          <span className="text-primary">한자리에.</span>
        </h1>
        <p className="mt-7 max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground [animation-delay:160ms]">
          단톡방·교수 추천으로 알음알음 모인 동문을 찾고, 커피챗·제안으로 연결되는
          실명 기반 동문 커뮤니티.
        </p>
        <div className="mt-10 flex animate-fade-up items-center gap-5 [animation-delay:240ms]">
          <Button asChild size="lg" className="px-8">
            <Link href="/login">시작하기</Link>
          </Button>
          <Link
            href="#how"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            어떻게 작동하나요?
          </Link>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-8 flex justify-center">
        <ArrowDown
          className="h-5 w-5 animate-bounce text-muted-foreground"
          aria-hidden
        />
      </div>
    </section>
  );
}

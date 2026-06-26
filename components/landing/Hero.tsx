import Link from "next/link";

import { ArrowRight, ArrowDown } from "lucide-react";

import { GridBackdrop } from "./GridBackdrop";
import { Grain } from "./Grain";
import { LightCursorGlow } from "./LightCursorGlow";
import { MeshBackground } from "./MeshBackground";

/**
 * 랜딩 히어로 — 블랙 캔버스 + 코발트 오로라 + 거대 키네틱 타이포.
 * 진입 애니메이션은 CSS(animate-fade-up)로 마운트 시 재생.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-24">
      <MeshBackground className="landing-mesh-background" />
      <LightCursorGlow />
      <GridBackdrop id="grid-hero" className="absolute inset-0 text-white/[0.04]" />
      <Grain />

      {/* 배경 초대형 아웃라인 워드마크 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-[6vw] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[26vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.06)]"
      >
        ALUMNI
      </span>

      <div className="relative z-10 mx-auto w-full max-w-screen-lg">
        <p className="flex animate-fade-up items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          <span className="h-px w-8 bg-primary" />
          한림대학교 MICE · 동문 네트워크
        </p>

        <h1 className="mt-7 animate-fade-up text-[clamp(3rem,9vw,7.5rem)] font-bold leading-[0.95] tracking-tight [animation-delay:80ms]">
          흩어진 동문을,
          <br />
          <span className="bg-gradient-to-r from-primary via-indigo-400 to-primary bg-clip-text text-transparent">
            다시 잇다.
          </span>
        </h1>

        <p className="mt-8 max-w-xl animate-fade-up text-lg leading-relaxed text-white/60 [animation-delay:160ms]">
          단톡방·교수 추천으로 알음알음 모인 동문을 한곳에서 찾고, 커피챗·제안으로
          연결되는 실명 기반 동문 커뮤니티.
        </p>

        <div className="mt-11 flex animate-fade-up flex-wrap items-center gap-4 [animation-delay:240ms]">
          <Link
            href="/login"
            className="group inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_0_50px_-12px_hsl(var(--primary))] transition hover:shadow-[0_0_70px_-8px_hsl(var(--primary))]"
          >
            지금 시작하기
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#features"
            className="inline-flex h-14 items-center rounded-full border border-white/15 px-7 text-base font-medium text-white/80 transition hover:border-white/40 hover:text-white"
          >
            둘러보기
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center">
        <ArrowDown className="h-5 w-5 animate-bounce text-white/40" aria-hidden />
      </div>
    </section>
  );
}

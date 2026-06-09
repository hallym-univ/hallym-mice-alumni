import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { GridBackdrop } from "./GridBackdrop";

/** 마지막 CTA — 풀블리드 코발트 밴드 + 거대 타이포. */
export function LandingCTA() {
  return (
    <section className="relative overflow-hidden bg-primary px-6 py-32 text-primary-foreground">
      <GridBackdrop id="grid-cta" className="absolute inset-0 text-white/10" />
      <div className="relative mx-auto max-w-screen-lg text-center">
        <h2 className="mx-auto max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-tight">
          동문은 가장 가까운
          <br />
          기회입니다.
        </h2>
        <p className="mt-6 text-lg text-primary-foreground/80">
          구글 계정이면 충분해요. 30초면 시작합니다.
        </p>
        <Link
          href="/login"
          className="group mt-10 inline-flex h-14 items-center gap-2 rounded-full bg-white px-9 text-base font-semibold text-black shadow-2xl transition hover:gap-3"
        >
          지금 시작하기
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

"use client";

import { useReveal } from "@/lib/hooks/useReveal";

const LANDING_STATS = [
  { figure: "1997", suffix: "", label: "설립연도" },
  // TODO: 공식 누적 동문 수 자료 확보 후 교체.
  { figure: "400", suffix: "+", label: "동문 배출 수" },
  // TODO: 전시-AI 트랙 컨소시엄 기업 수 확정 후 교체.
  { figure: "8", suffix: "+", label: "컨소시엄 기업 수" },
];

/** 통계 띠 — 설립연도와 임시 네트워크 규모 지표. */
export function StatsTeaser() {
  const ref = useReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      data-reveal
      className="border-t border-white/10 bg-black px-6 py-24"
    >
      <div className="mx-auto grid max-w-screen-lg gap-10 sm:grid-cols-3">
        {LANDING_STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-display text-[clamp(3.5rem,9vw,6rem)] leading-none text-white">
              {stat.figure}
              <span className="text-primary">{stat.suffix}</span>
            </div>
            <div className="mt-3 text-sm uppercase tracking-[0.2em] text-white/50">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useReveal } from "@/lib/hooks/useReveal";

/**
 * 통계 띠 — 거대 디스플레이 숫자(Instrument Serif). 실제 카운트는 page 에서 주입.
 */
export function StatsTeaser({
  counts,
}: {
  counts: { alumni: number; jobs: number; articles: number };
}) {
  const ref = useReveal<HTMLElement>();
  const stats = [
    { figure: counts.alumni, suffix: "+", label: "등록 동문" },
    { figure: counts.jobs, suffix: "", label: "진행 중 공고" },
    { figure: counts.articles, suffix: "", label: "동문 인터뷰" },
  ];
  return (
    <section
      ref={ref}
      data-reveal
      className="border-t border-white/10 bg-black px-6 py-24"
    >
      <div className="mx-auto grid max-w-screen-lg gap-10 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-[clamp(3.5rem,9vw,6rem)] leading-none text-white">
              {s.figure}
              <span className="text-primary">{s.suffix}</span>
            </div>
            <div className="mt-3 text-sm uppercase tracking-[0.2em] text-white/50">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

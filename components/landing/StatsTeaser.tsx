"use client";

import { useReveal } from "@/lib/hooks/useReveal";

/**
 * 추상 수치 티저 — 큰 디스플레이 서체(라틴/숫자).
 * 정적 placeholder. 실제 수치 연동(서버 COUNT)은 운영 후로 미룸(랜딩 정적·고속 유지).
 */
const STATS = [
  { figure: "12+", label: "기수" },
  { figure: "30+", label: "분야 태그" },
  { figure: "1:1", label: "실명 기반 연결" },
];

export function StatsTeaser() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} data-reveal className="border-t px-6 py-24">
      <div className="mx-auto grid max-w-screen-lg gap-10 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-6xl">{s.figure}</div>
            <div className="mt-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

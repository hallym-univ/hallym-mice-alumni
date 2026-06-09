"use client";

import { useReveal } from "@/lib/hooks/useReveal";

/** 가치 제안 3종 — 에디토리얼 넘버드 레이아웃. 스크롤 진입 시 페이드업. */
const ITEMS = [
  {
    n: "01",
    title: "동문 찾기",
    desc: "회사·직무·분야·기수로 흩어진 동문을 한 번에 검색하세요.",
  },
  {
    n: "02",
    title: "부담 없는 커피챗",
    desc: "오픈카톡으로 바로 연결하거나, 이메일 제안으로 가볍게 인사하세요.",
  },
  {
    n: "03",
    title: "실명 기반 신뢰",
    desc: "가입한 동문만 서로의 프로필을 봅니다. 익명 게시판이 아니에요.",
  },
];

export function ValueProps() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} data-reveal className="border-t px-6 py-24">
      <div className="mx-auto max-w-screen-lg">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          What you get
        </p>
        <div className="mt-12 grid gap-12 md:grid-cols-3">
          {ITEMS.map((it) => (
            <div key={it.n}>
              <span className="font-display text-5xl text-primary">{it.n}</span>
              <h3 className="mt-4 text-headline font-semibold">{it.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {it.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

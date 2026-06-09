"use client";

import { useReveal } from "@/lib/hooks/useReveal";

/** 작동 방식 3스텝 — 히어로의 "어떻게 작동하나요?" 앵커(#how). */
const STEPS = [
  {
    n: "01",
    title: "Google로 가입",
    desc: "이메일·비밀번호 없이 구글 계정으로 30초 만에 가입해요.",
  },
  {
    n: "02",
    title: "프로필 작성",
    desc: "회사·직무·분야·커피챗 가능 여부를 채우면 디렉토리에 노출돼요.",
  },
  {
    n: "03",
    title: "연결되기",
    desc: "관심 가는 동문에게 오픈카톡·이메일 제안으로 먼저 인사를 건네요.",
  },
];

export function HowItWorks() {
  const ref = useReveal<HTMLElement>();
  return (
    <section
      id="how"
      ref={ref}
      data-reveal
      className="border-t bg-secondary/40 px-6 py-24"
    >
      <div className="mx-auto max-w-screen-lg">
        <h2 className="text-display-2 font-bold">이렇게 연결돼요</h2>
        <ol className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t-2 border-foreground pt-5">
              <span className="font-display text-3xl text-primary">{s.n}</span>
              <h3 className="mt-3 text-title font-semibold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

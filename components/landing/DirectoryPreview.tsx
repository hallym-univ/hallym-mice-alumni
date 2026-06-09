"use client";

import { useReveal } from "@/lib/hooks/useReveal";
import { cn } from "@/lib/utils";

/**
 * 실명 디렉토리 미리보기 — 떠다니는 글래스 카드(코드 기반, 사진 0).
 * 좌측 카피 + 우측 카드 스택. 카드는 animate-float 로 은은하게 떠다닌다.
 */
interface Person {
  name: string;
  role: string;
  org: string;
  tags: string[];
  tone: "open" | "busy" | "offer";
}

const PEOPLE: Person[] = [
  { name: "김서연", role: "컨벤션 기획", org: "한국MICE진흥원", tags: ["기획", "컨벤션"], tone: "open" },
  { name: "정민석", role: "이벤트 PD", org: "CJ ENM", tags: ["영상", "이벤트"], tone: "busy" },
  { name: "최유진", role: "전시 기획", org: "코엑스", tags: ["전시", "컨벤션"], tone: "offer" },
  { name: "남도윤", role: "대표", org: "지이피 기획", tags: ["창업", "기획"], tone: "open" },
];

const TONE: Record<Person["tone"], { label: string; cls: string }> = {
  open: { label: "커피챗 가능", cls: "bg-emerald-400" },
  busy: { label: "지금은 바쁨", cls: "bg-white/30" },
  offer: { label: "제안만", cls: "bg-amber-400" },
};

export function DirectoryPreview() {
  const ref = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      data-reveal
      className="relative overflow-hidden border-t border-white/10 bg-black px-6 py-28"
    >
      <div className="mx-auto grid max-w-screen-lg items-center gap-14 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/50">
            Real-name directory
          </p>
          <h2 className="mt-5 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-tight">
            익명 게시판이
            <br />
            아니에요.
          </h2>
          <p className="mt-6 max-w-md text-white/60">
            회사·직무·분야·기수로 검색하고, 커피챗 가능 여부까지 한눈에. 가입한
            동문만 서로의 프로필을 봅니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["회사", "직무", "분야 태그", "기수", "커피챗"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PEOPLE.map((p, i) => (
              <div
                key={p.name}
                className="animate-float"
                style={{ animationDelay: `${i * -1.6}s` }}
              >
                <ProfileGlassCard person={p} tilt={i % 2 === 0 ? -2 : 2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileGlassCard({ person, tilt }: { person: Person; tilt: number }) {
  const tone = TONE[person.tone];
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-md"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-sm font-semibold text-white">
          {person.name.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{person.name}</p>
          <p className="truncate text-xs text-white/55">
            {person.role} · {person.org}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
          <span className={cn("h-1.5 w-1.5 rounded-full", tone.cls)} />
          {tone.label}
        </span>
        {person.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

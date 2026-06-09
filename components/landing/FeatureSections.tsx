"use client";

import type { ReactNode } from "react";

import { CalendarClock, MessageCircle, Search, Send } from "lucide-react";

import { useReveal } from "@/lib/hooks/useReveal";
import { cn } from "@/lib/utils";

/**
 * 핵심 기능 3섹션 — 거대 인덱스 넘버 + 코드 기반 모티프(목업). 히어로 #features 앵커.
 */
export function FeatureSections() {
  return (
    <section
      id="features"
      className="space-y-24 border-t border-white/10 bg-black px-6 py-28"
    >
      <div className="mx-auto max-w-screen-lg space-y-24">
        <FeatureRow
          index="01"
          title="흩어진 동문을 검색"
          desc="회사·직무·분야 태그·기수로 원하는 동문을 한 번에 찾아요. 커피챗 가능 여부까지 카드에서 바로 확인."
          motif={<SearchMotif />}
        />
        <FeatureRow
          index="02"
          title="부담 없이 연결"
          desc="오픈카톡으로 바로 대화하거나, 이메일 제안으로 가볍게 인사. 서로의 이메일은 공개되지 않아요."
          motif={<ChatMotif />}
          flip
        />
        <FeatureRow
          index="03"
          title="기회와 이야기"
          desc="동문이 올린 채용·공모·프로젝트 공고와, 선배들의 인터뷰·커리어 이야기를 한곳에서."
          motif={<JobMotif />}
        />
      </div>
    </section>
  );
}

function FeatureRow({
  index,
  title,
  desc,
  motif,
  flip = false,
}: {
  index: string;
  title: string;
  desc: string;
  motif: ReactNode;
  flip?: boolean;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-reveal
      className="grid items-center gap-12 md:grid-cols-2"
    >
      <div className={cn(flip && "md:order-2")}>
        <span className="font-display text-6xl text-primary">{index}</span>
        <h3 className="mt-4 text-[clamp(1.875rem,4vw,3rem)] font-bold leading-tight tracking-tight">
          {title}
        </h3>
        <p className="mt-5 max-w-md text-white/60">{desc}</p>
      </div>
      <div className={cn(flip && "md:order-1")}>{motif}</div>
    </div>
  );
}

/* ── 코드 기반 모티프(목업) ─────────────────────────────────────────────────── */

function MotifFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-5 shadow-2xl backdrop-blur">
      {children}
    </div>
  );
}

function SearchMotif() {
  return (
    <MotifFrame>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-3">
        <Search className="h-4 w-4 text-white/50" />
        <span className="text-sm text-white/80">마케팅 · 코엑스 · 18기</span>
        <span className="ml-auto h-4 w-px animate-pulse bg-primary" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["기획", "컨벤션", "호텔", "항공", "전시", "F&B"].map((t, i) => (
          <span
            key={t}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              i === 1
                ? "bg-primary text-primary-foreground"
                : "bg-white/5 text-white/60",
            )}
          >
            {t}
          </span>
        ))}
      </div>
    </MotifFrame>
  );
}

function ChatMotif() {
  return (
    <MotifFrame>
      <div className="space-y-3">
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-2.5 text-sm text-white/80">
            선배님 안녕하세요! 컨벤션 기획 직무가 궁금해서 커피챗 요청드려요 ☕
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            반가워요! 이번 주 목요일 어때요?
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1 text-xs text-white/40">
          <MessageCircle className="h-3.5 w-3.5" /> 오픈카톡 ·
          <Send className="h-3.5 w-3.5" /> 이메일 제안
        </div>
      </div>
    </MotifFrame>
  );
}

function JobMotif() {
  return (
    <MotifFrame>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
          정규직
        </span>
        <span className="flex items-center gap-1 text-xs text-white/40">
          <CalendarClock className="h-3.5 w-3.5" /> ~08.31 마감
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold">2026 국제회의 기획 신입 채용</p>
      <p className="mt-1 text-sm text-white/55">한국MICE진흥원 · 서울</p>
      <div className="mt-4 flex gap-2">
        <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-white/60">
          컨벤션
        </span>
        <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-white/60">
          기획
        </span>
      </div>
    </MotifFrame>
  );
}

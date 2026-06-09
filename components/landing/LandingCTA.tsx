"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useReveal } from "@/lib/hooks/useReveal";

import { AbstractField } from "./AbstractField";

/** 마지막 CTA 밴드 — 추상 배경 + 중앙 정렬. */
export function LandingCTA() {
  const ref = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      data-reveal
      className="relative overflow-hidden border-t px-6 py-28"
    >
      <AbstractField id="cta" />
      <div className="relative mx-auto max-w-screen-lg text-center">
        <h2 className="mx-auto max-w-2xl text-display-2 font-bold">
          지금 동문 네트워크에 합류하세요
        </h2>
        <p className="mt-4 text-muted-foreground">
          구글 계정이면 충분해요. 30초면 시작합니다.
        </p>
        <Button asChild size="lg" className="mt-8 px-10">
          <Link href="/login">시작하기</Link>
        </Button>
      </div>
    </section>
  );
}

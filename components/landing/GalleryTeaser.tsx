"use client";

import { cn } from "@/lib/utils";
import { useReveal } from "@/lib/hooks/useReveal";

import { GridBackdrop } from "./GridBackdrop";

/** 행사 기록 티저 — 사진 없이 코드 기반 추상 그리드(로그인 게이트 갤러리 암시). */
export function GalleryTeaser() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} data-reveal className="border-t px-6 py-24">
      <div className="mx-auto max-w-screen-lg">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Archive
        </p>
        <h2 className="mt-4 max-w-2xl text-display-2 font-bold">
          행사의 순간들, 기록으로
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          로그인하면 운영진이 큐레이션한 행사 앨범을 볼 수 있어요.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] overflow-hidden rounded-sm border bg-secondary"
            >
              <div
                className={cn(
                  "absolute inset-0",
                  i % 2
                    ? "bg-gradient-to-br from-primary/20 to-transparent"
                    : "bg-gradient-to-tr from-foreground/10 to-transparent",
                )}
              />
              <GridBackdrop
                id={`gallery-${i}`}
                cell={28}
                className="text-foreground/[0.07]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

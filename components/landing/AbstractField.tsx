import { cn } from "@/lib/utils";

import { GridBackdrop } from "./GridBackdrop";

/**
 * 히어로/CTA 배경 추상 필드 — 코발트 그라데이션 블롭 2개 + 격자(코드 기반·이미지 0).
 * 블롭은 gradient-drift 로 천천히 떠다닌다(reduced-motion 에서 정지 — globals.css).
 */
export function AbstractField({
  id = "hero",
  className,
}: {
  id?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -right-[12%] -top-[18%] h-[55vh] w-[55vh] animate-gradient-drift rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -left-[14%] top-[28%] h-[42vh] w-[42vh] animate-gradient-drift rounded-full bg-primary/10 blur-3xl [animation-delay:-7s]" />
      <GridBackdrop id={`grid-${id}`} className="text-foreground/[0.05]" />
    </div>
  );
}

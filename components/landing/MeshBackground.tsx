import { cn } from "@/lib/utils";

/**
 * 코발트 오로라 배경 — 블랙 캔버스 위 흐르는 그라데이션 블롭(코드 기반·이미지 0).
 * blur 가 큰 원들이 gradient-drift 로 천천히 흐른다(reduced-motion 에서 정지).
 */
export function MeshBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute left-1/2 top-[-10%] h-[70vh] w-[70vh] -translate-x-1/2 animate-gradient-drift rounded-full bg-primary/40 blur-[130px]" />
      <div className="absolute bottom-[0%] left-[-8%] h-[48vh] w-[48vh] animate-gradient-drift rounded-full bg-primary/25 blur-[110px] [animation-delay:-6s]" />
      <div className="absolute right-[-8%] top-[18%] h-[44vh] w-[44vh] animate-gradient-drift rounded-full bg-indigo-500/25 blur-[110px] [animation-delay:-11s]" />
    </div>
  );
}

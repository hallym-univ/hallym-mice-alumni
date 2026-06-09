import { cn } from "@/lib/utils";

/**
 * 코드 기반 추상 그래픽 — 얇은 격자 SVG(이미지 0, R2 자산 0).
 * currentColor 를 stroke 로 쓰므로 부모의 text-* 로 색/투명도를 조절한다.
 * 한 페이지에 여러 번 쓰일 수 있어 pattern id 를 prop 으로 분리(SVG id 충돌 방지).
 */
export function GridBackdrop({
  id = "grid",
  cell = 48,
  className,
}: {
  id?: string;
  cell?: number;
  className?: string;
}) {
  return (
    <svg aria-hidden className={cn("h-full w-full", className)}>
      <defs>
        <pattern
          id={id}
          width={cell}
          height={cell}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M${cell} 0H0V${cell}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

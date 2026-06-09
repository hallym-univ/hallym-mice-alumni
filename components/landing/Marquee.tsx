import { cn } from "@/lib/utils";

/**
 * 무한 마키 — 키워드가 흐르는 띠(코드 기반). 콘텐츠를 2배 복제해 seamless.
 * reduced-motion 에서 정지(globals.css 가 animation 무력화).
 */
export function Marquee({
  items,
  reverse = false,
  className,
}: {
  items: string[];
  reverse?: boolean;
  className?: string;
}) {
  const row = [...items, ...items];
  return (
    <div className={cn("flex overflow-hidden", className)} aria-hidden>
      <div
        className={cn(
          "flex shrink-0 animate-marquee items-center whitespace-nowrap",
          reverse && "[animation-direction:reverse]",
        )}
      >
        {row.map((it, i) => (
          <span key={i} className="flex items-center">
            <span className="px-6 text-2xl font-semibold tracking-tight text-white/70 sm:text-3xl">
              {it}
            </span>
            <span className="text-primary">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

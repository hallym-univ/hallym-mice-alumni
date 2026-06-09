import { cn, seedHue } from "@/lib/utils";

/**
 * 사진이 없는 콘텐츠/앨범 커버용 코드 기반 그라데이션 (이미지 0).
 * 제목 기반 결정적 색 + 큰 디스플레이 글리프로 에디토리얼하게 채운다.
 * 실제 커버(cover_url)가 있으면 호출부에서 <img> 를 쓰고, 없을 때만 이걸 쓴다.
 */
export function GradientCover({
  seed,
  label,
  className,
}: {
  seed: string;
  label?: string | null;
  className?: string;
}) {
  const hue = seedHue(seed);
  const glyph = (label ?? seed).trim().charAt(0) || "·";
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden", className)}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 64% 40%), hsl(${(hue + 48) % 360} 58% 24%))`,
      }}
    >
      <span className="pointer-events-none absolute -right-3 -top-8 select-none font-display text-[7rem] leading-none text-white/15">
        {glyph}
      </span>
      <span className="pointer-events-none absolute bottom-2 left-3 select-none text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
        Hallym MICE
      </span>
    </div>
  );
}

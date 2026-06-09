import { initials } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * 프로필 아바타 (이름 이니셜 폴백, §6.2 신뢰 시각화).
 * 사진이 없으면 이니셜 원형으로 표시한다(익명 명단처럼 보이지 않게).
 *
 * R2 공개 도메인이 환경마다 다르고 미설정일 수 있어 next/image 대신 일반 img 를 쓴다
 * (next.config remotePatterns 화이트리스트 의존을 피한다). 표시 전용·외부 URL 위험 없음.
 */
export function Avatar({
  src,
  name,
  size = 48,
  className,
}: {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} 프로필 사진`}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}
    >
      {initials(name)}
    </div>
  );
}

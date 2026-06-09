/**
 * 필름 그레인 오버레이 — SVG feTurbulence 노이즈(코드 기반). 다크 화면에 질감을 더한다.
 * 데이터 URI 라 네트워크 요청 0. mix-blend 로 은은하게.
 */
const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function Grain({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className ?? "pointer-events-none absolute inset-0"}
      style={{
        backgroundImage: `url("${NOISE}")`,
        backgroundSize: "180px 180px",
        opacity: 0.12,
        mixBlendMode: "overlay",
      }}
    />
  );
}

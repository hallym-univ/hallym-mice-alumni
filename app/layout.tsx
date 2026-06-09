import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

/**
 * 본문/UI 기본 글꼴 — Pretendard(가변). 한글·라틴 모두 커버, 한국어 UI에 최적.
 * 로컬 woff2(app/fonts)로 묶어 빌드타임 외부 의존성 0 → 인수인계/오프라인 안전.
 */
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

/** 디스플레이(헤드라인·숫자 강조) — Instrument Serif. 에디토리얼 무드의 포인트 서체. */
const display = localFont({
  src: "./fonts/InstrumentSerif-Regular.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "한림 MICE 동문",
  description: "한림대 MICE 동문을 찾고 커피챗·제안으로 연결되는 실명 기반 동문 커뮤니티",
};

// 모바일 우선(375px). 확대 허용(접근성).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

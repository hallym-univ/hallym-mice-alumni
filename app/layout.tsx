import type { Metadata, Viewport } from "next";

import "./globals.css";

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
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

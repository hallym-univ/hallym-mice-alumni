import type { ReactNode } from "react";

import { BottomNav } from "@/components/common/BottomNav";

/**
 * 로그인 후 영역 레이아웃 (§5.1).
 * 모바일 우선(375px). 하단 고정 3탭(홈/동문/내 정보).
 * 인증/온보딩 보호는 middleware 가 1차로, 각 서버 핸들러의 withAuth 가 2차로 강제한다.
 *
 * 온보딩 페이지는 같은 그룹에 있지만 하단 탭을 숨긴다(아래 hideNav 처리 대신
 * onboarding 은 자체 레이아웃 흐름을 쓰므로 여기서는 항상 탭을 노출하되,
 * onboarding 라우트는 풀스크린 폼이라 탭 위에 그려져도 무방하게 설계).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}

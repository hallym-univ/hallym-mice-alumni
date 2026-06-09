import type { ReactNode } from "react";

import { AppHeader } from "@/components/common/AppHeader";
import { BottomNav } from "@/components/common/BottomNav";
import { requireMember } from "@/lib/guards/requireMember";
import { getPublicUrl } from "@/lib/storage";

/**
 * 로그인 후 영역 레이아웃 (§5.1).
 * 모바일 우선(375px). 상단 헤더(계정 메뉴) + 하단 고정 4탭(홈/동문/기회/내 정보).
 * 인증/온보딩 보호는 middleware 가 1차로, 각 서버 핸들러의 withAuth 가 2차로 강제한다.
 *
 * 헤더 컨텍스트는 best-effort 로 조회한다: 온보딩 미완료(프로필 없음) 사용자는
 * requireMember 가 throw → 헤더를 숨긴다(풀스크린 온보딩 폼 보호).
 */
async function getHeaderContext() {
  try {
    const me = await requireMember();
    return {
      name: me.profile.name,
      photoSrc: me.profile.photo_path ? getPublicUrl(me.profile.photo_path) : null,
      profileId: me.profile.id,
      isAdmin: me.isAdmin,
    };
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const header = await getHeaderContext();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      {header ? <AppHeader {...header} /> : null}
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}

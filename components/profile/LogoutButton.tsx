"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * 로그아웃 버튼 — 단일 구현(DRY).
 * 헤더 계정 메뉴와 /me 계정 탭이 동일한 이 컴포넌트를 쓴다.
 * Button 의 모든 props(variant/size/className 등)를 그대로 받는다.
 */
export function LogoutButton({
  children = "로그아웃",
  ...props
}: ComponentProps<typeof Button>) {
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Button {...props} onClick={logout}>
      {children}
    </Button>
  );
}

"use client";

import { useState } from "react";

import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";

/**
 * Google OAuth 로그인 버튼 (브라우저 클라이언트 = Auth 전용).
 * 로그인 후 /auth/callback 으로 돌아오고, callback 라우트가 세션을 교환한 뒤
 * 프로필 유무에 따라 /onboarding 또는 next 경로로 보낸다.
 */
export function LoginButton() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/home";
    const redirectTo = `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setLoading(false);
      // 실패 시 사용자에게 재시도를 유도(간단 alert; feature 단계에서 토스트로 대체).
      alert("로그인을 시작할 수 없어요. 잠시 후 다시 시도해주세요.");
    }
    // 성공 시 브라우저가 Google로 리다이렉트되므로 상태 초기화 불필요.
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? "이동 중..." : "Google로 계속하기"}
    </Button>
  );
}

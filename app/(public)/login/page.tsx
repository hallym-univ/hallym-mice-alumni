import { Suspense } from "react";

import { LoginButton } from "./login-button";
import { LoginNotice } from "./login-notice";

/**
 * 로그인 (§6.1).
 * Google OAuth 만 제공한다. 이메일/비밀번호 가입 없음.
 */
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-between px-5">
      <div className="pt-20">
        <h1 className="text-2xl font-bold tracking-tight">한림 MICE 동문</h1>
        <p className="mt-2 text-muted-foreground">
          Google 계정으로 로그인하고 동문 네트워크에 합류하세요.
        </p>
      </div>

      <div className="pb-16">
        <Suspense fallback={null}>
          <LoginNotice />
          <LoginButton />
        </Suspense>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          만 14세 이상만 가입할 수 있어요.
        </p>
      </div>
    </main>
  );
}

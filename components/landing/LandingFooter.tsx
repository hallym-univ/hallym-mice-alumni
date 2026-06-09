import Link from "next/link";

/** 랜딩 푸터 — 약관/처리방침 동의 문구 보존(가입 동의의 고지 맥락). */
export function LandingFooter() {
  return (
    <footer className="border-t px-6 py-12">
      <div className="mx-auto flex max-w-screen-lg flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold tracking-tight">한림 MICE 동문</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          시작하면{" "}
          <Link href="/terms" className="underline underline-offset-4">
            이용약관
          </Link>{" "}
          및{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보 처리방침
          </Link>
          에 동의하게 됩니다. · 만 14세 이상 가입 가능.
        </p>
      </div>
    </footer>
  );
}

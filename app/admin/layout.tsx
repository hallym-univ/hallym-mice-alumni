import type { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/guards/requireAdmin";
import { AuthError } from "@/lib/guards/withAuth";

/**
 * 관리자 영역 레이아웃 (§6.7).
 * 서버에서 requireAdmin 으로 가드한다(URL 직접 입력 차단 — §6.7 완료 기준).
 * 일반 사용자/비로그인은 접근 시 리다이렉트된다.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError && err.status === 401) {
      redirect("/login?next=/admin");
    }
    // 403 (로그인했으나 관리자 아님) 또는 기타 → 홈으로.
    redirect("/home");
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[720px]">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <Link href="/admin" className="font-bold">
          관리자
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/admin/reports">신고</Link>
          <Link href="/admin/members">회원</Link>
          <Link href="/admin/jobs">구인</Link>
          <Link href="/admin/content">콘텐츠</Link>
          <Link href="/admin/albums">갤러리</Link>
          <Link href="/home">앱으로</Link>
        </nav>
      </header>
      <main className="px-5 py-6">{children}</main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Home, User, Users } from "lucide-react";

import { TABS } from "@/lib/messages";
import { cn } from "@/lib/utils";

/**
 * 하단 고정 3탭 네비게이션 (§5.1): 홈 / 동문 / 내 정보.
 * 모바일 우선(375px). 터치 타깃 44px 이상.
 * 온보딩 등 풀스크린 라우트에서는 자동으로 숨긴다.
 */
const ITEMS = [
  { href: "/home", label: TABS.home, icon: Home },
  { href: "/alumni", label: TABS.alumni, icon: Users },
  { href: "/me", label: TABS.me, icon: User },
] as const;

// 하단 탭을 숨길 라우트(풀스크린 폼 등).
const HIDDEN_PREFIXES = ["/onboarding"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t bg-background">
      <ul className="flex">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

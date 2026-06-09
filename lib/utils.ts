import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { publicEnv } from "@/lib/env";

/** Tailwind 클래스 병합 헬퍼 (shadcn 표준) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * R2 객체 key → 공개 읽기 URL (클라이언트·서버 공용).
 * NEXT_PUBLIC_R2_PUBLIC_BASE_URL 기반으로 조립한다(공개값이라 브라우저 사용 가능).
 * 서버 전용 lib/storage.getPublicUrl 과 동일 규칙이되, server-only 가드가 없어 컴포넌트에서 쓸 수 있다.
 */
export function r2PublicUrl(key: string): string {
  const base = publicEnv.r2PublicBaseUrl.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${base}/${cleanKey}`;
}

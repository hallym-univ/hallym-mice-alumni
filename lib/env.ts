/**
 * 환경변수 접근 단일 지점.
 * - 이 파일은 브라우저에 노출 가능한 공개값(NEXT_PUBLIC_*)만 다룬다.
 * - 서버 전용 시크릿은 lib/server-env.ts 에서만 읽는다.
 */

/** 브라우저에서도 읽어도 되는 공개값. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  r2PublicBaseUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "",
};

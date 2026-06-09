/**
 * 환경변수 접근 단일 지점.
 * - 공개값(NEXT_PUBLIC_*)과 서버 전용 시크릿을 분리해 읽는다.
 * - serverEnv는 절대 클라이언트 번들에 들어가서는 안 된다(server-only 가드가 있는 곳에서만 사용).
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`[env] 필수 환경변수 누락: ${name}`);
  }
  return value;
}

/** 브라우저에서도 읽어도 되는 공개값. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  r2PublicBaseUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "",
};

/**
 * 서버 전용 시크릿. 호출 시점에 검증한다(빌드 타임 throw 방지).
 * server-only 모듈(admin.ts, storage, guards)에서만 호출할 것.
 */
export function getServerEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    adminEmails: (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    r2: {
      accountId: process.env.R2_ACCOUNT_ID ?? "",
      bucket: process.env.R2_BUCKET ?? "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  };
}

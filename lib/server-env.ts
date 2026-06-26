import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`[env] 필수 환경변수 누락: ${name}`);
  }
  return value;
}

/**
 * 서버 전용 시크릿. 호출 시점에 검증한다(빌드 타임 throw 방지).
 * 이 모듈은 server-only 로 보호되어 클라이언트 번들 import 시 빌드가 실패한다.
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

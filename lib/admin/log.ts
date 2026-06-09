import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 관리자 작업 감사 로그 (§6.7 완료 기준: "모든 관리자 작업이 admin_logs 에 기록").
 *
 * 모든 관리 변경(신고 처리·정지·역할/상태 변경·배지 토글·앨범 CRUD)은
 * 이 헬퍼로 admin_logs 에 한 줄 남긴다. 서버(withAuth 통과) 컨텍스트에서만 호출한다.
 *
 * adminProfileId = 작업을 수행한 관리자의 profiles.id (me.profile.id).
 */
export interface AdminLogInput {
  adminProfileId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
}

export async function recordAdminLog(input: AdminLogInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_logs").insert({
    admin_profile_id: input.adminProfileId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    detail: input.detail ?? null,
  });

  if (error) {
    // 로깅 실패가 본 작업을 막지는 않되, 서버 로그에 남겨 추적 가능하게 한다.
    console.error(`[admin_logs] 기록 실패: ${error.message}`, {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
    });
  }
}

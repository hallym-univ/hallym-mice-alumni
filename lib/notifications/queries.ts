import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/guards/withAuth";
import type { NotificationListItem } from "@/lib/notifications/types";

/**
 * 알림 인박스 서버 조회 (§6.8). in_app 채널만(이메일은 Resend 발송 로그).
 * 알림 '생성'은 본 범위 밖 — 인박스는 기존 행을 읽기만 한다(read_at 컬럼 기존재, 마이그레이션 0).
 */

const UNREAD_COUNT_QUERY_LIMIT = 100;

export async function listMyNotifications(
  me: AuthContext,
): Promise<NotificationListItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("id,type,payload,read_at,created_at")
    .eq("profile_id", me.profile.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as NotificationListItem[];
}

/**
 * 헤더 배지는 정확한 전체 개수보다 "읽지 않은 알림이 있는지/99+" 표시가 중요하다.
 * exact count 대신 unread 인덱스를 타고 필요한 행까지만 읽어 앱 공통 레이아웃 비용을 고정한다.
 */
export async function unreadCount(
  me: AuthContext,
  maxRows = UNREAD_COUNT_QUERY_LIMIT,
): Promise<number> {
  const limit = normalizeUnreadLimit(maxRows);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id")
    .eq("profile_id", me.profile.id)
    .eq("channel", "in_app")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[notifications] unread count 실패:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

function normalizeUnreadLimit(maxRows: number): number {
  if (!Number.isSafeInteger(maxRows) || maxRows < 1) return UNREAD_COUNT_QUERY_LIMIT;
  return Math.min(maxRows, UNREAD_COUNT_QUERY_LIMIT);
}

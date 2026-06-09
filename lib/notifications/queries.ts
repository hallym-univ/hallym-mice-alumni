import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/guards/withAuth";
import type { NotificationRow } from "@/types/database";

/**
 * 알림 인박스 서버 조회 (§6.8). in_app 채널만(이메일은 Resend 발송 로그).
 * 알림 '생성'은 본 범위 밖 — 인박스는 기존 행을 읽기만 한다(read_at 컬럼 기존재, 마이그레이션 0).
 */

export async function listMyNotifications(
  me: AuthContext,
): Promise<NotificationRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("*")
    .eq("profile_id", me.profile.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as NotificationRow[];
}

export async function unreadCount(me: AuthContext): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", me.profile.id)
    .eq("channel", "in_app")
    .is("read_at", null);
  return count ?? 0;
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRow, ReportRow, ReportTargetType } from "@/types/database";

/**
 * 관리자 화면용 서버 조회 모음 (§6.7 / §11.6).
 * 모두 service_role(admin) 클라이언트로 서버에서만 호출한다.
 * 호출부(Server Component / Route Handler)는 requireAdmin 으로 가드되어 있어야 한다.
 */

export interface DashboardSummary {
  openReportCount: number;
  reviewingReportCount: number;
  recentSignups: Pick<
    ProfileRow,
    "id" | "name" | "role" | "status" | "is_verified" | "created_at"
  >[];
  recentReports: Pick<
    ReportRow,
    "id" | "target_type" | "target_id" | "reason" | "status" | "created_at"
  >[];
}

/** 대시보드 "오늘 할 일" 요약: 미처리 신고 수 + 최근 가입/신고. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const admin = createAdminClient();

  const [openCount, reviewingCount, signups, reports] = await Promise.all([
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "reviewing"),
    admin
      .from("profiles")
      .select("id, name, role, status, is_verified, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    openReportCount: openCount.count ?? 0,
    reviewingReportCount: reviewingCount.count ?? 0,
    recentSignups: signups.data ?? [],
    recentReports: reports.data ?? [],
  };
}

/** 동일 대상에 대해 자동 숨김 임계치(3건) 도달 여부 판정용 신고 건수. */
export async function countReportsForTarget(
  targetType: ReportTargetType,
  targetId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  return count ?? 0;
}

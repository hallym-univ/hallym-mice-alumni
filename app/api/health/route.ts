import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 헬스체크 (§9.2 / T-306) — Supabase pause 방지 핑 대상.
 * 무인증 200 응답. DB 1행 select 로 프로젝트를 깨운다.
 * cron-job.org / UptimeRobot 가 5~10분마다 호출한다.
 *
 * 주의: withAuth 로 감싸지 않는 "의도적 공개" 엔드포인트다(개인정보 미반환).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    // 가벼운 1행 조회(태그 마스터). DB 깨우기 용도.
    const { error } = await admin.from("tags").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, error: "db" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch {
    return NextResponse.json({ ok: false, error: "env" }, { status: 503 });
  }
}

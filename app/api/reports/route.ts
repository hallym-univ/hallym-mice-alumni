import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";
import {
  checkDailyLimit,
  countTodayEvents,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validators";

/**
 * POST /api/reports — 신고 접수 (§6.7 / T-205 연계).
 *
 * 남용 방지: 신고 1일 10건 + 동일 대상 1일 1건(report_submit 이벤트 카운트 기준).
 * 자동 hidden(임계치 3건)·상태머신 처리는 관리자 버티컬(B2)이 담당한다.
 */
export const POST = withAuth(
  async (req, { me }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 422 },
      );
    }
    const { target_type, target_id, reason } = parsed.data;

    if (target_type === "profile" && target_id === me.profile.id) {
      return Response.json({ error: "본인은 신고할 수 없어요." }, { status: 400 });
    }

    const cohortHash = makeCohortHash(me.userId);

    // 1일 10건 한도.
    let daily: Awaited<ReturnType<typeof checkDailyLimit>>;
    let sameTarget: number;
    try {
      daily = await checkDailyLimit({
        cohortHash,
        eventType: "report_submit",
        limit: 10,
      });
      sameTarget = await countTodayEvents({
        cohortHash,
        eventType: "report_submit",
        targetId: target_id,
      });
    } catch (err) {
      if (err instanceof RateLimitUnavailableError) {
        return Response.json(
          { error: "요청 제한 확인에 실패했어요. 잠시 후 다시 시도해주세요." },
          { status: 503 },
        );
      }
      throw err;
    }
    if (!daily.ok) {
      return Response.json(
        { error: "오늘 신고 가능한 횟수를 모두 사용했어요." },
        { status: 429 },
      );
    }

    // 동일 대상 1일 1건.
    if (sameTarget >= 1) {
      return Response.json(
        { error: "이미 오늘 신고한 대상이에요." },
        { status: 429 },
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.from("reports").insert({
      reporter_profile_id: me.profile.id,
      target_type,
      target_id,
      reason,
      status: "open",
    });

    if (error) {
      console.error("[POST /api/reports]", error);
      return Response.json({ error: "신고 접수에 실패했어요." }, { status: 500 });
    }

    try {
      await recordEvent({
        eventType: "report_submit",
        cohortHash,
        profileId: me.profile.id,
        targetId: target_id,
      });
    } catch (e) {
      console.error("[reports] event 기록 실패", e);
    }

    return Response.json({ ok: true });
  },
  { role: "member" },
);

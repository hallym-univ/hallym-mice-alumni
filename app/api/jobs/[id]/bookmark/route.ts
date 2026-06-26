import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";
import { checkDailyLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { resolveRouteUuidParam } from "@/lib/validators";

const JOB_BOOKMARK_DAILY_LIMIT = 100;

/**
 * POST   /api/jobs/:id/bookmark — 관심 공고 저장 (§6.4). blocks 라우트와 동일 패턴.
 * DELETE /api/jobs/:id/bookmark — 저장 해제.
 */
type Params = { id: string };

export const POST = withAuth<Params>(
  async (_req, { me, params }) => {
    const id = await resolveId(params);
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    const admin = createAdminClient();
    const { data: job } = await admin
      .from("jobs")
      .select("id")
      .eq("id", id)
      .maybeSingle<{ id: string }>();
    if (!job) {
      return Response.json({ error: "공고를 찾을 수 없어요." }, { status: 404 });
    }

    const { data: existingBookmark, error: existingError } = await admin
      .from("job_bookmarks")
      .select("job_id")
      .eq("profile_id", me.profile.id)
      .eq("job_id", id)
      .maybeSingle<{ job_id: string }>();
    if (existingError) {
      console.error("[POST /api/jobs/:id/bookmark] existing check", existingError);
      return Response.json({ error: "저장 상태 확인에 실패했어요." }, { status: 500 });
    }
    if (existingBookmark) {
      return Response.json({ ok: true });
    }

    const cohortHash = makeCohortHash(me.userId);
    try {
      const rate = await checkDailyLimit({
        cohortHash,
        eventType: "job_bookmark",
        limit: JOB_BOOKMARK_DAILY_LIMIT,
      });
      if (!rate.ok) {
        return Response.json(
          { error: "오늘 저장 가능한 관심 공고 수를 모두 사용했어요." },
          { status: 429 },
        );
      }
    } catch (err) {
      if (err instanceof RateLimitUnavailableError) {
        return Response.json(
          { error: "요청 제한 확인에 실패했어요. 잠시 후 다시 시도해주세요." },
          { status: 503 },
        );
      }
      throw err;
    }

    const { error } = await admin
      .from("job_bookmarks")
      .insert({ profile_id: me.profile.id, job_id: id });
    if (error) {
      if (error.code === "23505") {
        return Response.json({ ok: true });
      }
      console.error("[POST /api/jobs/:id/bookmark]", error);
      return Response.json({ error: "저장에 실패했어요." }, { status: 500 });
    }

    try {
      await recordEvent({
        eventType: "job_bookmark",
        cohortHash,
        profileId: me.profile.id,
        targetId: id,
      });
    } catch {
      // 이벤트 실패는 저장을 막지 않는다.
    }
    return Response.json({ ok: true });
  },
  { role: "member" },
);

export const DELETE = withAuth<Params>(
  async (_req, { me, params }) => {
    const id = await resolveId(params);
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("job_bookmarks")
      .delete()
      .eq("profile_id", me.profile.id)
      .eq("job_id", id);
    if (error) {
      return Response.json({ error: "저장 해제에 실패했어요." }, { status: 500 });
    }
    return Response.json({ ok: true });
  },
  { role: "member" },
);

async function resolveId(
  params: Promise<Params> | undefined,
): Promise<string | null> {
  return resolveRouteUuidParam(params, "id");
}

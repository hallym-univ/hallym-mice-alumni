import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInitialJobStatus } from "@/lib/jobs/policy";
import { jobInputSchema, jobListQuerySchema } from "@/lib/validators";
import { listPublishedJobs } from "@/lib/jobs/queries";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";
import { checkDailyLimit, RateLimitUnavailableError } from "@/lib/rate-limit";

const JOB_CREATE_DAILY_LIMIT = 10;

/**
 * GET  /api/jobs — 게시중 공고 목록/검색 (§6.4). 회원(active)만.
 * POST /api/jobs — 공고 등록. 작성자=본인, status=published(서버 정책).
 *
 * 쿼리: q, type(job_type), tag, cursor
 */
export const GET = withAuth(
  async (req, { me }) => {
    const sp = new URL(req.url).searchParams;
    const parsed = jobListQuerySchema.safeParse(Object.fromEntries(sp));
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "검색 조건을 확인해주세요." },
        { status: 400 },
      );
    }
    const input = parsed.data;

    try {
      const result = await listPublishedJobs(me, {
        q: input.q,
        jobType: input.type,
        tagId: input.tag,
        cursor: input.cursor,
      });
      return Response.json(result);
    } catch (e) {
      console.error("[GET /api/jobs]", e);
      return Response.json({ error: "목록을 불러오지 못했어요." }, { status: 500 });
    }
  },
  { role: "member" },
);

export const POST = withAuth(
  async (req, { me }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const parsed = jobInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const cohortHash = makeCohortHash(me.userId);

    try {
      const rate = await checkDailyLimit({
        cohortHash,
        eventType: "job_create",
        limit: JOB_CREATE_DAILY_LIMIT,
      });
      if (!rate.ok) {
        return Response.json(
          { error: "오늘 등록 가능한 기회 수를 모두 사용했어요." },
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

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("jobs")
      .insert({
        author_id: me.profile.id,
        title: input.title,
        organization: input.organization,
        job_type: input.job_type,
        location: input.location ?? null,
        deadline: input.deadline ?? null,
        compensation: input.compensation ?? null,
        description: input.description,
        requirements: input.requirements ?? null,
        apply_url: input.apply_url ?? null,
        contact: input.contact ?? null,
        status: getInitialJobStatus(),
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error || !data) {
      console.error("[POST /api/jobs]", error);
      return Response.json({ error: "공고 등록에 실패했어요." }, { status: 500 });
    }

    if (input.tag_ids?.length) {
      await admin
        .from("job_tags")
        .insert(input.tag_ids.map((tag_id) => ({ job_id: data.id, tag_id })));
    }

    try {
      await recordEvent({
        eventType: "job_create",
        cohortHash,
        profileId: me.profile.id,
        targetId: data.id,
      });
    } catch (e) {
      console.error("[jobs] event 기록 실패", e);
    }

    return Response.json({ id: data.id }, { status: 201 });
  },
  { role: "member" },
);

import { withAuth } from "@/lib/guards/withAuth";
import { listPublishedPosts } from "@/lib/connect/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";
import { checkDailyLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { postInputSchema } from "@/lib/validators";

const POST_CREATE_DAILY_LIMIT = 20;

/**
 * GET  /api/posts — 커넥트 피드. active 회원만.
 * POST /api/posts — 게시글 작성. author/status 는 서버가 강제한다.
 */
export const GET = withAuth(
  async (_req, { me }) => {
    try {
      const items = await listPublishedPosts(me);
      return Response.json({ items });
    } catch (e) {
      console.error("[GET /api/posts]", e);
      return Response.json({ error: "게시글을 불러오지 못했어요." }, { status: 500 });
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

    const parsed = postInputSchema.safeParse(body);
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
        eventType: "post_create",
        limit: POST_CREATE_DAILY_LIMIT,
      });
      if (!rate.ok) {
        return Response.json(
          { error: "오늘 작성 가능한 게시글 수를 모두 사용했어요." },
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
      .from("posts")
      .insert({
        author_id: me.profile.id,
        title: input.title,
        body: input.body,
        post_type: input.post_type,
        external_url: input.external_url ?? null,
        status: "published",
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error || !data) {
      console.error("[POST /api/posts]", error);
      return Response.json({ error: "게시글 저장에 실패했어요." }, { status: 500 });
    }

    if (input.tag_ids?.length) {
      await admin
        .from("post_tags")
        .insert(input.tag_ids.map((tag_id) => ({ post_id: data.id, tag_id })));
    }

    try {
      await recordEvent({
        eventType: "post_create",
        cohortHash,
        profileId: me.profile.id,
        targetId: data.id,
      });
    } catch (e) {
      console.error("[posts] event 기록 실패", e);
    }

    return Response.json({ id: data.id }, { status: 201 });
  },
  { role: "member" },
);

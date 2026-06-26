import { withAuth } from "@/lib/guards/withAuth";
import { listComments } from "@/lib/connect/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";
import { checkDailyLimit, RateLimitUnavailableError } from "@/lib/rate-limit";
import { commentInputSchema, resolveRouteUuidParam } from "@/lib/validators";

type Params = { id: string };
const COMMENT_PREVIEW_LIMIT = 5;
const COMMENT_CREATE_DAILY_LIMIT = 80;
const COMMENT_CREATE_PER_POST_DAILY_LIMIT = 20;

export const GET = withAuth<Params>(
  async (_req, { params }) => {
    const id = await resolveRouteUuidParam(params, "id");
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    try {
      const items = await listComments(id, COMMENT_PREVIEW_LIMIT);
      return Response.json({ items });
    } catch (e) {
      console.error("[GET /api/posts/:id/comments]", e);
      return Response.json({ error: "댓글을 불러오지 못했어요." }, { status: 500 });
    }
  },
  { role: "member" },
);

export const POST = withAuth<Params>(
  async (req, { me, params }) => {
    const id = await resolveRouteUuidParam(params, "id");
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const parsed = commentInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "댓글을 확인해주세요." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: post } = await admin
      .from("posts")
      .select("id,status")
      .eq("id", id)
      .maybeSingle<{ id: string; status: string }>();
    if (!post || post.status !== "published") {
      return Response.json({ error: "댓글을 남길 수 없는 게시글이에요." }, { status: 404 });
    }

    const cohortHash = makeCohortHash(me.userId);
    try {
      const [daily, perPost] = await Promise.all([
        checkDailyLimit({
          cohortHash,
          eventType: "comment_create",
          limit: COMMENT_CREATE_DAILY_LIMIT,
        }),
        checkDailyLimit({
          cohortHash,
          eventType: "comment_create",
          limit: COMMENT_CREATE_PER_POST_DAILY_LIMIT,
          targetId: id,
        }),
      ]);
      if (!daily.ok) {
        return Response.json(
          { error: "오늘 작성 가능한 댓글 수를 모두 사용했어요." },
          { status: 429 },
        );
      }
      if (!perPost.ok) {
        return Response.json(
          { error: "이 게시글에 오늘 작성 가능한 댓글 수를 모두 사용했어요." },
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

    const { error } = await admin.from("comments").insert({
      post_id: id,
      author_id: me.profile.id,
      body: parsed.data.body,
      status: "published",
    });
    if (error) {
      console.error("[POST /api/posts/:id/comments]", error);
      return Response.json({ error: "댓글 저장에 실패했어요." }, { status: 500 });
    }

    try {
      await recordEvent({
        eventType: "comment_create",
        cohortHash,
        profileId: me.profile.id,
        targetId: id,
      });
    } catch (e) {
      console.error("[comments] event 기록 실패", e);
    }

    return Response.json({ ok: true }, { status: 201 });
  },
  { role: "member" },
);

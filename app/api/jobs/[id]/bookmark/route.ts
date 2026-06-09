import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";

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

    const { error } = await admin
      .from("job_bookmarks")
      .upsert(
        { profile_id: me.profile.id, job_id: id },
        { onConflict: "profile_id,job_id", ignoreDuplicates: true },
      );
    if (error) {
      console.error("[POST /api/jobs/:id/bookmark]", error);
      return Response.json({ error: "저장에 실패했어요." }, { status: 500 });
    }

    try {
      await recordEvent({
        eventType: "job_bookmark",
        cohortHash: makeCohortHash(me.userId),
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
  if (!params) return null;
  const resolved = await params;
  return resolved?.id ?? null;
}

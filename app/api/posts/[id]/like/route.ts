import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { id: string };

export const POST = withAuth<Params>(
  async (_req, { me, params }) => {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: post } = await admin
      .from("posts")
      .select("id,status")
      .eq("id", id)
      .maybeSingle<{ id: string; status: string }>();
    if (!post || post.status !== "published") {
      return Response.json({ error: "반응할 수 없는 게시글이에요." }, { status: 404 });
    }

    const { error } = await admin.from("post_likes").upsert(
      {
        post_id: id,
        profile_id: me.profile.id,
      },
      { onConflict: "post_id,profile_id" },
    );
    if (error) {
      console.error("[POST /api/posts/:id/like]", error);
      return Response.json({ error: "좋아요 저장에 실패했어요." }, { status: 500 });
    }
    return Response.json({ ok: true });
  },
  { role: "member" },
);

export const DELETE = withAuth<Params>(
  async (_req, { me, params }) => {
    const { id } = await params;
    const admin = createAdminClient();
    const { error } = await admin
      .from("post_likes")
      .delete()
      .eq("post_id", id)
      .eq("profile_id", me.profile.id);
    if (error) {
      console.error("[DELETE /api/posts/:id/like]", error);
      return Response.json({ error: "좋아요 해제에 실패했어요." }, { status: 500 });
    }
    return Response.json({ ok: true });
  },
  { role: "member" },
);

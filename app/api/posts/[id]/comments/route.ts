import { withAuth } from "@/lib/guards/withAuth";
import { listComments } from "@/lib/connect/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentInputSchema } from "@/lib/validators";

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { params }) => {
    const { id } = await params;
    try {
      const items = await listComments(id);
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
    const { id } = await params;
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
    return Response.json({ ok: true }, { status: 201 });
  },
  { role: "member" },
);

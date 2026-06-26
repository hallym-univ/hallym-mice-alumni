import { createAdminClient } from "@/lib/supabase/admin";
import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { articleInputSchema } from "@/lib/validators";
import type { ArticleRow } from "@/types/database";

/**
 * 콘텐츠 컬렉션 API (§6.6 / Phase 3). 운영자 전용(앨범 admin 패턴 복제).
 *
 * GET  /api/admin/content — 전체 콘텐츠 목록(상태 무관).
 * POST /api/admin/content — 콘텐츠 생성(status=draft, author=본인).
 */
type AdminArticleListItem = Pick<
  ArticleRow,
  "id" | "title" | "status" | "created_at"
>;

const ADMIN_ARTICLE_LIST_COLS = "id,title,status,created_at";

export const GET = withAuth(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("articles")
      .select(ADMIN_ARTICLE_LIST_COLS)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      return Response.json({ error: "콘텐츠 목록 조회에 실패했어요." }, { status: 500 });
    }
    return Response.json({ articles: (data ?? []) as AdminArticleListItem[] });
  },
  { role: "admin" },
);

export const POST = withAuth(
  async (req, { me }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청 본문이에요." }, { status: 400 });
    }

    const parsed = articleInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }
    const input = parsed.data;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("articles")
      .insert({
        author_id: me.profile.id,
        title: input.title,
        summary: input.summary,
        body: input.body,
        cover_path: input.cover_path ?? null,
        related_profile_id: input.related_profile_id ?? null,
        tags: input.tags ?? [],
        status: "draft",
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error || !data) {
      return Response.json({ error: "콘텐츠 생성에 실패했어요." }, { status: 500 });
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "article_create",
      targetType: "article",
      targetId: data.id,
      detail: { title: input.title },
    });

    return Response.json({ id: data.id }, { status: 201 });
  },
  { role: "admin" },
);

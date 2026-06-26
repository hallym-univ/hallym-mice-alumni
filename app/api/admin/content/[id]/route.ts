import { createAdminClient } from "@/lib/supabase/admin";
import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { deleteObject } from "@/lib/storage";
import {
  articleInputSchema,
  articleStatusSchema,
  resolveRouteUuidParam,
} from "@/lib/validators";
import type { ArticleRow, ArticleStatus } from "@/types/database";

/**
 * 단일 콘텐츠 API (§6.6 / Phase 3). 운영자 전용(앨범 [id] 패턴 복제).
 *
 * GET    /api/admin/content/:id — 콘텐츠 + 관련 동문 이름(편집용).
 * PATCH  /api/admin/content/:id — 본문 수정 및/또는 상태 전이(draft/published/hidden).
 * DELETE /api/admin/content/:id — 삭제(커버 R2 객체 정리).
 */
type Params = { id: string };
type AdminArticleEditorItem = Pick<
  ArticleRow,
  | "id"
  | "title"
  | "summary"
  | "body"
  | "cover_path"
  | "related_profile_id"
  | "tags"
  | "status"
>;

const ADMIN_ARTICLE_EDITOR_COLS =
  "id,title,summary,body,cover_path,related_profile_id,tags,status";

export const GET = withAuth<Params>(
  async (_req, { params }) => {
    const id = await resolveId(params);
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    const admin = createAdminClient();
    const { data: article, error } = await admin
      .from("articles")
      .select(ADMIN_ARTICLE_EDITOR_COLS)
      .eq("id", id)
      .maybeSingle<AdminArticleEditorItem>();
    if (error || !article) {
      return Response.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
    }

    let related: { id: string; name: string } | null = null;
    if (article.related_profile_id) {
      const { data: p } = await admin
        .from("profiles")
        .select("id,name")
        .eq("id", article.related_profile_id)
        .maybeSingle<{ id: string; name: string }>();
      if (p) related = p;
    }

    return Response.json({ article, related });
  },
  { role: "admin" },
);

export const PATCH = withAuth<Params>(
  async (req, { me, params }) => {
    const id = await resolveId(params);
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청 본문이에요." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("articles")
      .select("id, status")
      .eq("id", id)
      .maybeSingle<Pick<ArticleRow, "id" | "status">>();
    if (!existing) {
      return Response.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
    }

    const parsed = articleInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }
    const input = parsed.data;

    const update: Partial<ArticleRow> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.summary !== undefined) update.summary = input.summary;
    if (input.body !== undefined) update.body = input.body;
    if (input.cover_path !== undefined) update.cover_path = input.cover_path ?? null;
    if (input.related_profile_id !== undefined)
      update.related_profile_id = input.related_profile_id ?? null;
    if (input.tags !== undefined) update.tags = input.tags ?? [];

    // 상태 전이(선택).
    const statusRaw = (body as { status?: unknown }).status;
    if (statusRaw !== undefined) {
      const sp = articleStatusSchema.safeParse(statusRaw);
      if (!sp.success) {
        return Response.json({ error: "잘못된 상태값이에요." }, { status: 400 });
      }
      update.status = sp.data as ArticleStatus;
    }

    update.updated_at = new Date().toISOString();

    const { error } = await admin.from("articles").update(update).eq("id", id);
    if (error) {
      return Response.json({ error: "콘텐츠 수정에 실패했어요." }, { status: 500 });
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "article_update",
      targetType: "article",
      targetId: id,
      detail: { from: existing.status, to: update.status ?? existing.status },
    });

    return Response.json({ ok: true });
  },
  { role: "admin" },
);

export const DELETE = withAuth<Params>(
  async (_req, { me, params }) => {
    const id = await resolveId(params);
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    const admin = createAdminClient();
    const { data: article } = await admin
      .from("articles")
      .select("id, cover_path")
      .eq("id", id)
      .maybeSingle<Pick<ArticleRow, "id" | "cover_path">>();
    if (!article) {
      return Response.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
    }

    const { error } = await admin.from("articles").delete().eq("id", id);
    if (error) {
      return Response.json({ error: "콘텐츠 삭제에 실패했어요." }, { status: 500 });
    }

    if (article.cover_path) {
      await Promise.allSettled([deleteObject(article.cover_path)]);
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "article_delete",
      targetType: "article",
      targetId: id,
    });

    return Response.json({ ok: true });
  },
  { role: "admin" },
);

async function resolveId(
  params: Promise<Params> | undefined,
): Promise<string | null> {
  return resolveRouteUuidParam(params, "id");
}

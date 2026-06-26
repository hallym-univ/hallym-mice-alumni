import { createAdminClient } from "@/lib/supabase/admin";
import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { deleteObject } from "@/lib/storage";
import { albumInputSchema, resolveRouteUuidParam } from "@/lib/validators";
import type { AlbumImageRow, AlbumRow } from "@/types/database";

/**
 * 단일 앨범 API (T-155 / §6.5).
 *
 * GET    /api/admin/albums/:id  → 앨범 + 이미지 목록(운영자 편집용).
 * PATCH  /api/admin/albums/:id  → 앨범 수정(게시 동의 게이트 포함).
 * DELETE /api/admin/albums/:id  → 앨범 삭제(이미지 R2 객체 정리 후 cascade).
 *
 * Next 15: route context.params 는 Promise 이므로 await 한다.
 */

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { params }) => {
    const id = await resolveId(params);
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    const admin = createAdminClient();
    const { data: album, error } = await admin
      .from("albums")
      .select("*")
      .eq("id", id)
      .maybeSingle<AlbumRow>();

    if (error || !album) {
      return Response.json({ error: "앨범을 찾을 수 없어요." }, { status: 404 });
    }

    const { data: images } = await admin
      .from("album_images")
      .select("*")
      .eq("album_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    return Response.json({ album, images: (images ?? []) as AlbumImageRow[] });
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

    const parsed = albumInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: existing, error: loadErr } = await admin
      .from("albums")
      .select("*")
      .eq("id", id)
      .maybeSingle<AlbumRow>();
    if (loadErr || !existing) {
      return Response.json({ error: "앨범을 찾을 수 없어요." }, { status: 404 });
    }

    const input = parsed.data;
    const update: Partial<AlbumRow> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.event_date !== undefined) update.event_date = input.event_date ?? null;
    if (input.description !== undefined) update.description = input.description ?? null;
    if (input.hashtags !== undefined) update.hashtags = input.hashtags;
    if (input.cover_image_key !== undefined)
      update.cover_image_key = input.cover_image_key ?? null;
    if (input.youtube_video_id !== undefined)
      update.youtube_video_id = input.youtube_video_id ?? null;
    if (input.consent_confirmed !== undefined)
      update.consent_confirmed = input.consent_confirmed;
    if (input.is_public !== undefined) update.is_public = input.is_public;

    // 게시 동의 게이트: 최종 상태 기준으로 판정한다.
    const finalConsent =
      update.consent_confirmed ?? existing.consent_confirmed;
    const finalPublic = update.is_public ?? existing.is_public;
    if (finalPublic && !finalConsent) {
      return Response.json(
        { error: "게시 동의(consent_confirmed)를 확인해야 공개할 수 있어요." },
        { status: 400 },
      );
    }

    update.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("albums")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle<AlbumRow>();

    if (error || !data) {
      return Response.json({ error: "앨범 수정에 실패했어요." }, { status: 500 });
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "album_update",
      targetType: "album",
      targetId: id,
      detail: { ...input },
    });

    return Response.json({ album: data });
  },
  { role: "admin" },
);

export const DELETE = withAuth<Params>(
  async (_req, { me, params }) => {
    const id = await resolveId(params);
    if (!id) return Response.json({ error: "잘못된 경로예요." }, { status: 400 });

    const admin = createAdminClient();

    // 삭제 전 이미지 키 수집 → R2 객체 정리(베스트에포트).
    const { data: album } = await admin
      .from("albums")
      .select("id, cover_image_key")
      .eq("id", id)
      .maybeSingle<Pick<AlbumRow, "id" | "cover_image_key">>();
    if (!album) {
      return Response.json({ error: "앨범을 찾을 수 없어요." }, { status: 404 });
    }

    const { data: images } = await admin
      .from("album_images")
      .select("image_key")
      .eq("album_id", id);

    const keys = [
      ...(images ?? []).map((i) => i.image_key),
      ...(album.cover_image_key ? [album.cover_image_key] : []),
    ];

    // DB 삭제(album_images 는 on delete cascade).
    const { error } = await admin.from("albums").delete().eq("id", id);
    if (error) {
      return Response.json({ error: "앨범 삭제에 실패했어요." }, { status: 500 });
    }

    // R2 정리(실패해도 DB 삭제는 성공으로 본다 — 고아 객체는 운영 정리).
    await Promise.allSettled(keys.map((k) => deleteObject(k)));

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "album_delete",
      targetType: "album",
      targetId: id,
      detail: { removedKeys: keys.length },
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

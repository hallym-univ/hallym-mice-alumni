import { createAdminClient } from "@/lib/supabase/admin";
import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { albumImageInputSchema } from "@/lib/validators";
import type { AlbumImageRow } from "@/types/database";

/**
 * 앨범 이미지 추가 (T-155 / §6.5).
 *
 * POST /api/admin/albums/:id/images  → 이미 R2 에 업로드된 객체 key 를 album_images 에 연결.
 *
 * 업로드 자체는 /api/uploads 에서 presigned PUT 으로 처리되고, 여기서는 그 key 를 등록만 한다.
 * sort_order 미지정 시 현재 최대값 +1 로 끝에 붙인다.
 */

type Params = { id: string };

export const POST = withAuth<Params>(
  async (req, { me, params }) => {
    const resolved = params ? await params : null;
    const albumId = resolved?.id;
    if (!albumId) {
      return Response.json({ error: "잘못된 경로예요." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청 본문이에요." }, { status: 400 });
    }

    const parsed = albumImageInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // 앨범 존재 확인.
    const { data: album } = await admin
      .from("albums")
      .select("id")
      .eq("id", albumId)
      .maybeSingle();
    if (!album) {
      return Response.json({ error: "앨범을 찾을 수 없어요." }, { status: 404 });
    }

    let sortOrder = parsed.data.sort_order;
    if (sortOrder === undefined) {
      const { data: last } = await admin
        .from("album_images")
        .select("sort_order")
        .eq("album_id", albumId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle<Pick<AlbumImageRow, "sort_order">>();
      sortOrder = (last?.sort_order ?? -1) + 1;
    }

    const { data, error } = await admin
      .from("album_images")
      .insert({
        album_id: albumId,
        image_key: parsed.data.image_key,
        caption: parsed.data.caption ?? null,
        sort_order: sortOrder,
      })
      .select("*")
      .maybeSingle<AlbumImageRow>();

    if (error || !data) {
      return Response.json({ error: "이미지 추가에 실패했어요." }, { status: 500 });
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "album_image_add",
      targetType: "album",
      targetId: albumId,
      detail: { imageId: data.id, key: data.image_key },
    });

    return Response.json({ image: data }, { status: 201 });
  },
  { role: "admin" },
);

import { createAdminClient } from "@/lib/supabase/admin";
import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { deleteObject } from "@/lib/storage";
import { resolveRouteUuidParam } from "@/lib/validators";
import type { AlbumImageRow } from "@/types/database";

/**
 * 앨범 이미지 삭제 (T-155 / §6.5).
 *
 * DELETE /api/admin/albums/images/:imageId  → album_images 행 삭제 + R2 객체 정리.
 * 게시 후 본인 요청 시 즉시 내리는 삭제 절차(§8.2 초상권)도 이 경로로 처리한다.
 */

type Params = { imageId: string };

export const DELETE = withAuth<Params>(
  async (_req, { me, params }) => {
    const imageId = await resolveRouteUuidParam(params, "imageId");
    if (!imageId) {
      return Response.json({ error: "잘못된 경로예요." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: image } = await admin
      .from("album_images")
      .select("id, album_id, image_key")
      .eq("id", imageId)
      .maybeSingle<Pick<AlbumImageRow, "id" | "album_id" | "image_key">>();

    if (!image) {
      return Response.json({ error: "이미지를 찾을 수 없어요." }, { status: 404 });
    }

    const { error } = await admin.from("album_images").delete().eq("id", imageId);
    if (error) {
      return Response.json({ error: "이미지 삭제에 실패했어요." }, { status: 500 });
    }

    // R2 정리(베스트에포트).
    await Promise.allSettled([deleteObject(image.image_key)]);

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "album_image_delete",
      targetType: "album",
      targetId: image.album_id,
      detail: { imageId, key: image.image_key },
    });

    return Response.json({ ok: true });
  },
  { role: "admin" },
);

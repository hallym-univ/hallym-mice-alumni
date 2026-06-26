import { createAdminClient } from "@/lib/supabase/admin";
import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { albumInputSchema } from "@/lib/validators";
import type { AlbumRow } from "@/types/database";

/**
 * 갤러리 앨범 컬렉션 API (T-155 / §6.5).
 *
 * GET  /api/admin/albums  → 운영자용 전체 앨범 목록(공개/비공개 모두).
 * POST /api/admin/albums  → 앨범 생성.
 *
 * 규칙(§6.5 완료 기준):
 *  - 운영자만 CRUD(requireAdmin).
 *  - 잘못된 YouTube URL 은 저장 거부(youtubeSchema → videoId 변환 실패 시 400).
 *  - consent_confirmed === false 이면 is_public=true 로 만들 수 없다(게시 동의 게이트).
 *  - 모든 변경은 admin_logs 기록.
 */

export const GET = withAuth(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("albums")
      .select("*")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return Response.json({ error: "앨범 목록 조회에 실패했어요." }, { status: 500 });
    }
    return Response.json({ albums: (data ?? []) as AlbumRow[] });
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

    const parsed = albumInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const consentConfirmed = input.consent_confirmed ?? false;
    const wantPublic = input.is_public ?? false;

    // 게시 동의 게이트: 동의 미확인 시 공개 불가.
    if (wantPublic && !consentConfirmed) {
      return Response.json(
        { error: "게시 동의(consent_confirmed)를 확인해야 공개할 수 있어요." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("albums")
      .insert({
        title: input.title,
        event_date: input.event_date ?? null,
        description: input.description ?? null,
        hashtags: input.hashtags ?? [],
        cover_image_key: input.cover_image_key ?? null,
        youtube_video_id: input.youtube_video_id ?? null,
        consent_confirmed: consentConfirmed,
        is_public: wantPublic,
        created_by: me.profile.id,
      })
      .select("*")
      .maybeSingle<AlbumRow>();

    if (error || !data) {
      return Response.json({ error: "앨범 생성에 실패했어요." }, { status: 500 });
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "album_create",
      targetType: "album",
      targetId: data.id,
      detail: { title: data.title, is_public: data.is_public },
    });

    return Response.json({ album: data }, { status: 201 });
  },
  { role: "admin" },
);

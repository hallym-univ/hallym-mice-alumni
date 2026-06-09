import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/notifications/read — 알림 읽음 처리 (§6.8). 회원 전용.
 * body: { all: true } 전체 읽음 / { id } 단건 읽음. 본인 알림만(profile_id 일치) 갱신.
 */
export const POST = withAuth(
  async (req, { me }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const { id, all } = (body ?? {}) as { id?: unknown; all?: unknown };
    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (all === true) {
      const { error } = await admin
        .from("notifications")
        .update({ read_at: now })
        .eq("profile_id", me.profile.id)
        .is("read_at", null);
      if (error) {
        return Response.json({ error: "처리에 실패했어요." }, { status: 500 });
      }
    } else if (typeof id === "string" && id) {
      const { error } = await admin
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id)
        .eq("profile_id", me.profile.id);
      if (error) {
        return Response.json({ error: "처리에 실패했어요." }, { status: 500 });
      }
    } else {
      return Response.json({ error: "id 또는 all 이 필요해요." }, { status: 400 });
    }

    return Response.json({ ok: true });
  },
  { role: "member" },
);

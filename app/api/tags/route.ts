import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/tags — 분야 태그 마스터 목록(필터·프로필 편집용).
 * 회원이면 누구나 읽을 수 있다(공개 마스터 데이터).
 */
export const GET = withAuth(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tags")
      .select("id,name,category")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[GET /api/tags]", error);
      return Response.json({ error: "태그를 불러오지 못했어요." }, { status: 500 });
    }
    return Response.json({ tags: data ?? [] });
  },
  { role: "member" },
);

import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 분야 태그 마스터 조회 — 프로세스 캐시(5분).
 * 태그는 관리자만 변경하는 거의 불변 마스터라 요청별 신선도가 필요 없다.
 * (이전엔 /alumni·/jobs·/me 가 같은 쿼리를 매 방문 복붙 실행 — 페이지당 DB 1왕복 낭비.)
 * admin 클라이언트는 쿠키 비의존이라 unstable_cache 안에서 안전하다.
 */
export type TagMaster = { id: string; name: string; category: string | null };

export const getTagsMaster = unstable_cache(
  async (): Promise<TagMaster[]> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tags")
      .select("id,name,category")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    return (data ?? []) as TagMaster[];
  },
  ["tags-master"],
  { revalidate: 300 },
);

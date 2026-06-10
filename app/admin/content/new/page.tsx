import Link from "next/link";

import { ContentEditor } from "@/components/admin/ContentEditor";
import { requireAdmin } from "@/lib/guards/requireAdmin";

/**
 * 새 콘텐츠 작성 (§6.6). 수정과 동일한 풀 에디터(마크다운·커버·관련 동문).
 * 레이아웃 가드에 더해 페이지 자체도 requireAdmin(심층 방어 §7.4 — 부분 RSC 내비게이션 대비).
 * loadAuth 가 요청 단위 캐시라 중복 비용은 없다.
 */
export const dynamic = "force-dynamic";

export default async function NewContentPage() {
  await requireAdmin();
  return (
    <section className="space-y-4">
      <Link
        href="/admin/content"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 콘텐츠 목록
      </Link>
      <h1 className="text-lg font-bold">새 콘텐츠</h1>
      <ContentEditor />
    </section>
  );
}

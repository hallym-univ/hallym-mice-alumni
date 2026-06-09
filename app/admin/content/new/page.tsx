import Link from "next/link";

import { ContentEditor } from "@/components/admin/ContentEditor";

/** 새 콘텐츠 작성 (§6.6). 수정과 동일한 풀 에디터(마크다운·커버·관련 동문). */
export const dynamic = "force-dynamic";

export default function NewContentPage() {
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

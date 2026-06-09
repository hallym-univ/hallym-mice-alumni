import Link from "next/link";

import { ContentEditor } from "@/components/admin/ContentEditor";

/**
 * 운영자 콘텐츠 편집 (§6.6). admin 레이아웃이 requireAdmin 으로 가드한다.
 */
export const dynamic = "force-dynamic";

export default async function AdminContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <section className="space-y-4">
      <Link
        href="/admin/content"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 콘텐츠 목록
      </Link>
      <ContentEditor articleId={id} />
    </section>
  );
}

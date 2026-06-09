import Link from "next/link";

import { ArticleReader } from "@/components/content/ArticleReader";
import { EmptyState } from "@/components/common/EmptyState";
import { requireMemberPage } from "@/lib/guards/page";
import { getPublishedArticle } from "@/lib/content/public";
import { makeCohortHash, recordEvent } from "@/lib/analytics/events";
import { ERROR } from "@/lib/messages";

/**
 * 회원 콘텐츠 상세 (§6.6). 게시(published)만 열람, 조회 시 article_view 기록.
 */
export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireMemberPage(`/content/${id}`);

  const result = await getPublishedArticle(id);
  if (result.kind === "not_found") {
    return (
      <section className="px-5 py-6">
        <Link
          href="/content"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 콘텐츠
        </Link>
        <EmptyState
          title={ERROR.notFound.title}
          description="비공개이거나 삭제된 콘텐츠예요."
          action={{ label: ERROR.notFound.cta, href: "/content" }}
          className="mt-6"
        />
      </section>
    );
  }

  try {
    await recordEvent({
      eventType: "article_view",
      cohortHash: makeCohortHash(me.userId),
      profileId: me.profile.id,
      targetId: id,
    });
  } catch {
    // 무시.
  }

  return (
    <section className="px-5 py-6">
      <Link
        href="/content"
        className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 콘텐츠
      </Link>
      <ArticleReader article={result.article} />
    </section>
  );
}

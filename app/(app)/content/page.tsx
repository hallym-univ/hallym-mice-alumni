import { ArticleCard } from "@/components/content/ArticleCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { requireMemberPage } from "@/lib/guards/page";
import { listPublishedArticles } from "@/lib/content/public";
import { EMPTY } from "@/lib/messages";

/**
 * 회원 콘텐츠 목록 (§6.6). 로그인 회원만(서버 가드). 게시(published)만 노출.
 */
export default async function ContentPage() {
  await requireMemberPage("/content");

  let articles: Awaited<ReturnType<typeof listPublishedArticles>>;
  try {
    articles = await listPublishedArticles();
  } catch {
    return (
      <section className="px-5 py-6">
        <h1 className="mb-4 text-xl font-bold">콘텐츠</h1>
        <ErrorState description="콘텐츠를 불러오지 못했어요." />
      </section>
    );
  }

  return (
    <section className="px-5 py-6">
      <header className="mb-4 space-y-1">
        <h1 className="text-xl font-bold">콘텐츠</h1>
        <p className="text-sm text-muted-foreground">
          동문 인터뷰와 소식을 모았어요.
        </p>
      </header>

      {articles.length === 0 ? (
        <EmptyState
          title={EMPTY.contentNoData.title}
          description={EMPTY.contentNoData.cta}
        />
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </section>
  );
}

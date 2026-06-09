import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GradientCover } from "@/components/common/GradientCover";
import { formatDate } from "@/lib/labels";
import type { ArticleListItem } from "@/lib/content/types";

/**
 * 콘텐츠 카드 (§6.6). 커버·제목·요약·태그·날짜.
 * 커버는 R2 공개 URL 을 일반 img 로 표시(next/image remotePatterns 의존 회피, Avatar 와 동일 방침).
 */
export function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link href={`/content/${article.id}`} className="block">
      <Card className="overflow-hidden transition-colors hover:bg-accent/40">
        {article.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.cover_url}
            alt=""
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <GradientCover
            seed={article.id}
            label={article.title}
            className="aspect-[16/9] w-full"
          />
        )}
        <div className="p-4">
          <h3 className="font-semibold leading-snug">{article.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {article.summary}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {article.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">
              {formatDate(article.created_at)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

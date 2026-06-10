import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GradientCover } from "@/components/common/GradientCover";
import { formatDate } from "@/lib/labels";
import type { ArticleListItem } from "@/lib/content/types";

/**
 * 콘텐츠 카드 (§6.6). 커버·제목·요약·태그·날짜.
 * 커버는 next/image 로 표시 — R2 원본(수백 KB)을 뷰포트 크기로 리사이즈·webp/avif 변환해
 * 전송량을 ~90% 줄인다(remotePatterns 는 next.config 에서 env 로 구성).
 */
export function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link href={`/content/${article.id}`} className="block">
      <Card className="overflow-hidden transition-colors hover:bg-accent/40">
        {article.cover_url ? (
          <div className="relative aspect-[16/9] w-full">
            <Image
              src={article.cover_url}
              alt=""
              fill
              sizes="(max-width: 480px) 100vw, 448px"
              className="object-cover"
            />
          </div>
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

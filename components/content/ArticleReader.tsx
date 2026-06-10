import Link from "next/link";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Avatar } from "@/components/profile/Avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GradientCover } from "@/components/common/GradientCover";
import { formatDate } from "@/lib/labels";
import type { ArticleDetail } from "@/lib/content/types";

/**
 * 콘텐츠 본문 리더 (§6.6). 커버·제목·요약·본문(markdown)·태그·관련 동문.
 * 본문은 react-markdown + remark-gfm 으로 렌더(작성은 RichEditor/WYSIWYG, 저장 포맷은 마크다운).
 */
export function ArticleReader({ article }: { article: ArticleDetail }) {
  return (
    <article>
      {article.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover_url}
          alt=""
          className="aspect-[16/9] w-full rounded-lg border object-cover"
        />
      ) : (
        <GradientCover
          seed={article.id}
          label={article.title}
          className="aspect-[16/9] w-full rounded-lg border"
        />
      )}

      <h1 className="mt-5 text-headline font-bold">{article.title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {formatDate(article.created_at)}
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {article.summary}
      </p>

      <div className="prose prose-neutral mt-6 max-w-none prose-headings:tracking-tight prose-a:text-primary prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </div>

      {article.tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {article.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}

      {article.related_profile ? (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">관련 동문</h2>
          <Link
            href={`/alumni/${article.related_profile.id}`}
            className="mt-2 block"
          >
            <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40">
              <Avatar
                src={article.related_profile.photo_url}
                name={article.related_profile.name}
                size={40}
              />
              <span className="font-medium">{article.related_profile.name}</span>
            </Card>
          </Link>
        </div>
      ) : null}
    </article>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EMPTY } from "@/lib/messages";
import { ARTICLE_STATUS_LABEL, ARTICLE_STATUS_TONE, formatDate } from "@/lib/labels";
import type { ArticleRow } from "@/types/database";

/**
 * 운영자 콘텐츠 목록 + 새 콘텐츠 진입 (§6.6).
 * 작성/수정 모두 풀 에디터(/admin/content/new · /admin/content/:id)로 일관 처리한다.
 * 데이터 접근은 /api/admin/content(서버, requireAdmin)로만.
 */
export function ContentManager() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setArticles(json.articles ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/admin/content/new">+ 새 콘텐츠</Link>
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : articles.length === 0 ? (
        <EmptyState
          title={EMPTY.contentNoData.title}
          description="새 콘텐츠를 작성해 동문 인터뷰·소식을 채워보세요."
        />
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/content/${a.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.created_at)}
                      </p>
                    </div>
                    <Badge variant={ARTICLE_STATUS_TONE[a.status]}>
                      {ARTICLE_STATUS_LABEL[a.status]}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

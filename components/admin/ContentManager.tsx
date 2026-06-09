"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EMPTY } from "@/lib/messages";
import { ARTICLE_STATUS_LABEL, ARTICLE_STATUS_TONE, formatDate } from "@/lib/labels";
import type { ArticleRow } from "@/types/database";

/**
 * 운영자 콘텐츠 목록 + 생성 (§6.6). AlbumsManager 패턴 복제.
 * 데이터 접근은 /api/admin/content(서버, requireAdmin)로만. 상세 편집은 /admin/content/:id.
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
        <CreateContentDialog />
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

function CreateContentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, summary, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "콘텐츠 생성에 실패했어요.");
        return;
      }
      setOpen(false);
      router.push(`/admin/content/${json.id}`);
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ 새 콘텐츠</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 콘텐츠</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="article-title">제목 *</Label>
            <Input
              id="article-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 12기 김동문 인터뷰"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="article-summary">요약 *</Label>
            <Input
              id="article-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="한 줄 요약"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="article-body">본문 *</Label>
            <Textarea
              id="article-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="본문 (이후 편집 화면에서 커버·태그·게시 설정)"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            onClick={() => void submit()}
            disabled={
              submitting ||
              !title.trim() ||
              !summary.trim() ||
              !body.trim()
            }
          >
            {submitting ? "생성 중..." : "만들기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

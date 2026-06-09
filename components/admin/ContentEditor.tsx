"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { useImageUpload } from "@/components/admin/useImageUpload";
import { ARTICLE_STATUS_LABEL, ARTICLE_STATUS_TONE } from "@/lib/labels";
import { r2PublicUrl } from "@/lib/utils";
import type { ArticleRow, ArticleStatus } from "@/types/database";

interface RelatedLite {
  id: string;
  name: string;
}

/**
 * 운영자 콘텐츠 편집 (§6.6). AlbumEditor 패턴.
 * 본문/요약/태그/커버/관련 동문 수정 + 게시 상태 전이 + 삭제.
 * 데이터 접근은 /api/admin/content/:id (서버, requireAdmin)로만.
 */
export function ContentEditor({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const isCreate = !articleId;
  const { upload, uploading } = useImageUpload();

  const [loading, setLoading] = useState(Boolean(articleId));
  const [loadError, setLoadError] = useState(false);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [related, setRelated] = useState<RelatedLite | null>(null);
  const [status, setStatus] = useState<ArticleStatus>("draft");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/admin/content/${articleId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("load failed");
      const json: { article: ArticleRow; related: RelatedLite | null } =
        await res.json();
      const a = json.article;
      setTitle(a.title);
      setSummary(a.summary);
      setBody(a.body);
      setTagsInput((a.tags ?? []).join(", "));
      setCoverPath(a.cover_path);
      setRelated(json.related);
      setStatus(a.status);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    if (articleId) void load();
  }, [articleId, load]);

  function parsedTags(): string[] {
    return tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const payload = {
      title,
      summary,
      body,
      tags: parsedTags(),
      cover_path: coverPath,
      related_profile_id: related?.id ?? null,
    };
    try {
      if (isCreate) {
        // 생성: POST → 새 글 편집 화면으로 이동(거기서 게시).
        const res = await fetch("/api/admin/content", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg({ ok: false, text: json.error ?? "생성에 실패했어요." });
          return;
        }
        router.push(`/admin/content/${json.id}`);
        router.refresh();
        return;
      }
      const res = await fetch(`/api/admin/content/${articleId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "저장에 실패했어요." });
        return;
      }
      setMsg({ ok: true, text: "저장했어요." });
    } catch {
      setMsg({ ok: false, text: "네트워크 오류가 발생했어요." });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(next: ArticleStatus) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/content/${articleId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "상태 변경에 실패했어요." });
        return;
      }
      setStatus(next);
      setMsg({ ok: true, text: "상태를 변경했어요." });
    } catch {
      setMsg({ ok: false, text: "네트워크 오류가 발생했어요." });
    } finally {
      setSaving(false);
    }
  }

  async function onPickCover(file: File) {
    const key = await upload(file, "content");
    if (key) setCoverPath(key);
  }

  if (loading) return <LoadingSkeleton variant="lines" count={6} />;
  if (loadError) return <ErrorState onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">내용</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="c-title">제목 *</Label>
            <Input
              id="c-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-summary">요약 *</Label>
            <Input
              id="c-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>본문 *</Label>
            <MarkdownEditor value={body} onChange={setBody} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-tags">태그 (쉼표로 구분, 최대 10개)</Label>
            <Input
              id="c-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="예: 인터뷰, 마케팅, 12기"
            />
          </div>
          {msg ? (
            <p
              role="status"
              className={msg.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}
            >
              {msg.text}
            </p>
          ) : null}
          <Button
            onClick={() => void save()}
            disabled={saving || !title.trim() || !summary.trim() || !body.trim()}
          >
            {saving
              ? isCreate
                ? "만드는 중…"
                : "저장 중…"
              : isCreate
                ? "콘텐츠 만들기"
                : "내용 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* 커버 이미지 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">커버 이미지</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {coverPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r2PublicUrl(coverPath)}
                alt="커버"
                className="h-16 w-28 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-16 w-28 items-center justify-center rounded-md border text-xs text-muted-foreground">
                없음
              </div>
            )}
            <label className="cursor-pointer">
              <span className="inline-flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent">
                {uploading ? "업로드 중..." : "커버 변경"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickCover(f);
                  e.target.value = "";
                }}
              />
            </label>
            {coverPath ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCoverPath(null)}
              >
                제거
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            변경 후 위 저장 버튼을 눌러야 반영돼요.
          </p>
        </CardContent>
      </Card>

      {/* 관련 동문 */}
      <RelatedSection
        related={related}
        onPick={setRelated}
        onClear={() => setRelated(null)}
      />

      {/* 게시 상태 + 삭제 — 생성 후(편집 모드)에만 노출 */}
      {articleId ? (
        <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">게시 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">현재</span>
            <Badge variant={ARTICLE_STATUS_TONE[status]}>
              {ARTICLE_STATUS_LABEL[status]}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {status !== "published" ? (
              <Button
                size="sm"
                disabled={saving}
                onClick={() => void changeStatus("published")}
              >
                게시하기
              </Button>
            ) : null}
            {status !== "draft" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void changeStatus("draft")}
              >
                임시저장으로
              </Button>
            ) : null}
            {status !== "hidden" ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={saving}
                onClick={() => void changeStatus("hidden")}
              >
                숨김
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <DangerZone
        articleId={articleId}
        onDeleted={() => router.push("/admin/content")}
      />
        </>
      ) : null}

      {isCreate ? (
        <p className="text-center text-xs text-muted-foreground">
          만들면 임시저장 상태로 생성돼요. 이어지는 편집 화면에서 게시할 수 있어요.
        </p>
      ) : null}
    </div>
  );
}

function RelatedSection({
  related,
  onPick,
  onClear,
}: {
  related: RelatedLite | null;
  onPick: (r: RelatedLite) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<RelatedLite[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/profiles?q=${encodeURIComponent(value.trim())}`,
        );
        const json = await res.json().catch(() => ({}));
        const items = (json.items ?? []) as Array<{ id: string; name: string }>;
        setResults(items.map((i) => ({ id: i.id, name: i.name })).slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">관련 동문 (선택)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {related ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm font-medium">{related.name}</span>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
              해제
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => onChange(e.target.value)}
                placeholder="이름·회사로 동문 검색"
                className="pl-9"
              />
            </div>
            {searching ? (
              <p className="text-xs text-muted-foreground">검색 중...</p>
            ) : results.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onPick(r);
                        setQ("");
                        setResults([]);
                      }}
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          연결 후 위 저장 버튼을 눌러야 반영돼요.
        </p>
      </CardContent>
    </Card>
  );
}

function DangerZone({
  articleId,
  onDeleted,
}: {
  articleId: string;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content/${articleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "삭제에 실패했어요.");
        return;
      }
      onDeleted();
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardContent className="space-y-2 p-4">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">정말 삭제할까요?</span>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void remove()}
            >
              삭제
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setConfirming(true)}
          >
            콘텐츠 삭제
          </Button>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

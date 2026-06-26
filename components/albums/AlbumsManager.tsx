"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

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
import { formatHashtags, parseHashtagsInput } from "@/lib/albums/hashtags";
import { EMPTY } from "@/lib/messages";
import type { AlbumRow } from "@/types/database";

/**
 * 운영자 앨범 목록 + 생성 (T-155 / §6.5).
 * 데이터 접근은 전부 /api/admin/albums(서버, requireAdmin)로만 한다.
 * 상세(이미지/공개/동의) 편집은 /admin/albums/:id 로 이동.
 */
type AdminAlbumListItem = Pick<
  AlbumRow,
  "id" | "title" | "event_date" | "hashtags" | "consent_confirmed" | "is_public"
>;

export function AlbumsManager() {
  const [albums, setAlbums] = useState<AdminAlbumListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/albums", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setAlbums(json.albums ?? []);
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
        <CreateAlbumDialog onCreated={load} />
      </div>

      {loading ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : albums.length === 0 ? (
        <EmptyState
          title={EMPTY.galleryNoAlbums.title}
          description="새 앨범을 만들어 행사 기록을 채워보세요."
        />
      ) : (
        <ul className="space-y-3">
          {albums.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/albums/${a.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.event_date ?? "행사일 미정"}
                      </p>
                      {(a.hashtags ?? []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(a.hashtags ?? []).slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="outline">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.consent_confirmed ? null : (
                        <Badge variant="outline">동의 미확인</Badge>
                      )}
                      <Badge variant={a.is_public ? "success" : "secondary"}>
                        {a.is_public ? "공개" : "비공개"}
                      </Badge>
                    </div>
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

function CreateAlbumDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedHashtags = parseHashtagsInput(hashtags);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/albums", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          event_date: eventDate,
          description,
          hashtags: parsedHashtags,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "앨범 생성에 실패했어요.");
        return;
      }
      setTitle("");
      setEventDate("");
      setDescription("");
      setHashtags("");
      setOpen(false);
      onCreated();
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ 새 앨범</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 앨범</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="album-title">제목 *</Label>
            <Input
              id="album-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 2025 MICE 동문의 밤"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="album-date">행사일</Label>
            <Input
              id="album-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="album-desc">설명</Label>
            <Textarea
              id="album-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="행사 소개 (선택)"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="album-tags">해시태그</Label>
            <Input
              id="album-tags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#동문회 #특강 #AI"
            />
            <p className="text-xs text-muted-foreground">
              최대 8개까지 저장돼요.
              {parsedHashtags.length > 0 ? ` ${formatHashtags(parsedHashtags)}` : ""}
            </p>
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
            disabled={submitting || title.trim().length === 0}
          >
            {submitting ? "생성 중..." : "만들기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

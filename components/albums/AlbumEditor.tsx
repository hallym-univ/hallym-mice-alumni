"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { useImageUpload } from "@/components/admin/useImageUpload";
import { extractYoutubeVideoId } from "@/lib/validators";
import { r2PublicUrl } from "@/lib/utils";
import type { AlbumImageRow, AlbumRow } from "@/types/database";

/**
 * 운영자 단일 앨범 편집 (T-155 / §6.5).
 *
 * - 메타(제목/행사일/설명/대표이미지/YouTube) 수정.
 * - 이미지 업로드(R2 presigned via /api/uploads) + 그리드 + 삭제.
 * - 게시 동의(consent_confirmed) 확인 없이는 공개(is_public=true) 불가.
 * - 잘못된 YouTube URL 은 서버가 저장 거부(앱 레벨 사전 안내).
 * - 앨범 삭제.
 *
 * 모든 데이터 접근은 /api/admin/albums/* (서버, requireAdmin)로만 한다.
 */
export function AlbumEditor({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [album, setAlbum] = useState<AlbumRow | null>(null);
  const [images, setImages] = useState<AlbumImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/albums/${albumId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setAlbum(json.album);
      setImages(json.images ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingSkeleton variant="lines" count={6} />;
  if (error || !album) return <ErrorState onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <AlbumMetaForm album={album} onSaved={setAlbum} />
      <PublishControl album={album} onChanged={setAlbum} />
      <ImagesSection
        albumId={albumId}
        images={images}
        coverKey={album.cover_image_key}
        onImagesChanged={setImages}
        onCoverChanged={(key) => setAlbum({ ...album, cover_image_key: key })}
      />
      <DangerZone
        albumId={albumId}
        onDeleted={() => router.push("/admin/albums")}
      />
    </div>
  );
}

/* ── 메타 폼 ─────────────────────────────────────────────────────────────── */
function AlbumMetaForm({
  album,
  onSaved,
}: {
  album: AlbumRow;
  onSaved: (a: AlbumRow) => void;
}) {
  const [title, setTitle] = useState(album.title);
  const [eventDate, setEventDate] = useState(album.event_date ?? "");
  const [description, setDescription] = useState(album.description ?? "");
  const [youtube, setYoutube] = useState(
    album.youtube_video_id ? `https://youtu.be/${album.youtube_video_id}` : "",
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const youtubeInvalid =
    youtube.trim().length > 0 && extractYoutubeVideoId(youtube) === null;

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/albums/${album.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          event_date: eventDate,
          description,
          youtube_video_id: youtube,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "저장에 실패했어요." });
        return;
      }
      onSaved(json.album);
      setMsg({ ok: true, text: "저장했어요." });
    } catch {
      setMsg({ ok: false, text: "네트워크 오류가 발생했어요." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">앨범 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="title">제목 *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="event-date">행사일</Label>
          <Input
            id="event-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="desc">설명</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="yt">YouTube 링크</Label>
          <Input
            id="yt"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtu.be/... (선택)"
            aria-invalid={youtubeInvalid}
          />
          {youtubeInvalid ? (
            <p className="text-xs text-destructive">
              유효한 YouTube 링크가 아니에요. 저장이 거부됩니다.
            </p>
          ) : null}
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
          disabled={saving || title.trim().length === 0 || youtubeInvalid}
        >
          {saving ? "저장 중..." : "정보 저장"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── 게시 동의 + 공개 토글 ───────────────────────────────────────────────── */
function PublishControl({
  album,
  onChanged,
}: {
  album: AlbumRow;
  onChanged: (a: AlbumRow) => void;
}) {
  const [consent, setConsent] = useState(album.consent_confirmed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: { consent_confirmed?: boolean; is_public?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/albums/${album.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "변경에 실패했어요.");
        // 실패 시 로컬 동의 상태를 서버값으로 되돌린다.
        setConsent(album.consent_confirmed);
        return;
      }
      onChanged(json.album);
      setConsent(json.album.consent_confirmed);
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  const canPublish = consent;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">게시 동의 · 공개</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <AlertDescription className="text-sm">
            행사 사진에는 동문 얼굴(초상권·영상정보)이 담깁니다. 피사체 게시 동의를
            확인한 경우에만 공개할 수 있어요.
          </AlertDescription>
        </Alert>

        <label className="flex items-start gap-3">
          <Checkbox
            checked={consent}
            disabled={busy}
            onCheckedChange={(v) => {
              const next = v === true;
              setConsent(next);
              void patch({ consent_confirmed: next });
            }}
          />
          <span className="text-sm">
            피사체 동문의 <strong>게시 동의를 확인</strong>했습니다.
          </span>
        </label>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <Label htmlFor="public-switch" className="text-sm">
              회원에게 공개
            </Label>
            <p className="text-xs text-muted-foreground">
              {canPublish
                ? "로그인 회원이 갤러리에서 볼 수 있어요."
                : "게시 동의 확인 후 공개할 수 있어요."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={album.is_public ? "success" : "secondary"}>
              {album.is_public ? "공개" : "비공개"}
            </Badge>
            <Switch
              id="public-switch"
              checked={album.is_public}
              disabled={busy || !canPublish}
              onCheckedChange={(v) => void patch({ is_public: v })}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ── 이미지 그리드 + 업로드 ──────────────────────────────────────────────── */
function ImagesSection({
  albumId,
  images,
  coverKey,
  onImagesChanged,
  onCoverChanged,
}: {
  albumId: string;
  images: AlbumImageRow[];
  coverKey: string | null;
  onImagesChanged: (imgs: AlbumImageRow[]) => void;
  onCoverChanged: (key: string) => void;
}) {
  const { upload, uploading, error: uploadError } = useImageUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const added: AlbumImageRow[] = [];
      for (const file of Array.from(files)) {
        const key = await upload(file, "album");
        if (!key) continue;
        const res = await fetch(`/api/admin/albums/${albumId}/images`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image_key: key }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.image) {
          added.push(json.image);
        } else {
          setError(json.error ?? "이미지 등록에 실패했어요.");
        }
      }
      if (added.length > 0) onImagesChanged([...images, ...added]);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setCover(file: File) {
    setError(null);
    const key = await upload(file, "cover");
    if (!key) return;
    const res = await fetch(`/api/admin/albums/${albumId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cover_image_key: key }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.album) {
      onCoverChanged(json.album.cover_image_key);
    } else {
      setError(json.error ?? "대표 이미지 설정에 실패했어요.");
    }
  }

  async function removeImage(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/albums/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "이미지 삭제에 실패했어요.");
        return;
      }
      onImagesChanged(images.filter((i) => i.id !== imageId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">이미지</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 대표 이미지 */}
        <div className="space-y-2">
          <Label className="text-sm">대표 이미지</Label>
          <div className="flex items-center gap-3">
            {coverKey ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                <Image
                  src={r2PublicUrl(coverKey)}
                  alt="대표 이미지"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-md border text-xs text-muted-foreground">
                없음
              </div>
            )}
            <label className="cursor-pointer">
              <span className="inline-flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent">
                {uploading ? "업로드 중..." : "대표 이미지 변경"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void setCover(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {/* 업로드 버튼 */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading || busy}
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || busy}
            onClick={() => fileRef.current?.click()}
          >
            {uploading || busy ? "업로드 중..." : "+ 이미지 추가"}
          </Button>
        </div>

        {(error || uploadError) ? (
          <p role="alert" className="text-sm text-destructive">
            {error ?? uploadError}
          </p>
        ) : null}

        {/* 그리드 */}
        {images.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            아직 이미지가 없어요.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {images.map((img) => (
              <li
                key={img.id}
                className="relative aspect-square overflow-hidden rounded-md border"
              >
                <Image
                  src={r2PublicUrl(img.image_key)}
                  alt={img.caption ?? "앨범 이미지"}
                  fill
                  sizes="(max-width: 720px) 33vw, 240px"
                  className="object-cover"
                />
                <button
                  type="button"
                  aria-label="이미지 삭제"
                  disabled={busy}
                  onClick={() => void removeImage(img.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 삭제 ───────────────────────────────────────────────────────────────── */
function DangerZone({
  albumId,
  onDeleted,
}: {
  albumId: string;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/albums/${albumId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "앨범 삭제에 실패했어요.");
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
            <span className="text-sm">정말 삭제할까요? (이미지도 함께 삭제)</span>
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
            앨범 삭제
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

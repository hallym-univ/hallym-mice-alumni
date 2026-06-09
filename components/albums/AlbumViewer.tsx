"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";

import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { r2PublicUrl } from "@/lib/utils";
import type { AlbumImageRow, AlbumRow } from "@/types/database";

/**
 * 회원 갤러리 — 앨범 상세 뷰어 (T-156 / §6.5).
 * YouTube 임베드 + 이미지 그리드(탭 시 라이트박스). 로그인 회원만 도달(서버 가드).
 * 라이트박스: 좌우 버튼 + ←/→ 키보드 네비, Esc 닫기(Dialog 기본).
 */
export function AlbumViewer({
  album,
  images,
}: {
  album: AlbumRow;
  images: AlbumImageRow[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const count = images.length;

  const prev = useCallback(
    () => setActive((i) => (i === null ? i : (i - 1 + count) % count)),
    [count],
  );
  const next = useCallback(
    () => setActive((i) => (i === null ? i : (i + 1) % count)),
    [count],
  );

  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, prev, next]);

  // 모바일 스와이프(좌/우 → 다음/이전).
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchX.current = null;
  }

  const current = active !== null ? images[active] : null;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{album.title}</h1>
        {album.event_date ? (
          <p className="text-sm text-muted-foreground">{album.event_date}</p>
        ) : null}
        {album.description ? (
          <p className="whitespace-pre-line text-sm">{album.description}</p>
        ) : null}
      </header>

      {/* YouTube 임베드 */}
      {album.youtube_video_id ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${album.youtube_video_id}`}
            title="행사 영상"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {/* 이미지 그리드 */}
      {images.length === 0 ? (
        <EmptyState title="아직 사진이 없어요" description="곧 채워질 예정이에요." />
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                className="relative block aspect-square w-full overflow-hidden rounded-md border"
                onClick={() => setActive(i)}
                aria-label={`사진 ${i + 1} 크게 보기`}
              >
                <Image
                  src={r2PublicUrl(img.image_key)}
                  alt={img.caption ?? "행사 사진"}
                  fill
                  sizes="(max-width: 480px) 33vw, 160px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 라이트박스 */}
      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[92vw] p-2 sm:max-w-[640px]">
          <DialogTitle className="sr-only">사진 보기</DialogTitle>
          {current ? (
            <div className="space-y-2">
              <div
                className="relative aspect-square w-full overflow-hidden rounded-md bg-muted"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <Image
                  src={r2PublicUrl(current.image_key)}
                  alt={current.caption ?? "행사 사진"}
                  fill
                  sizes="92vw"
                  className="object-contain"
                />
                {count > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="이전 사진"
                      onClick={prev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="다음 사진"
                      onClick={next}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                ) : null}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {current.caption ? <span>{current.caption}</span> : null}
                {count > 1 ? (
                  <span className="tabular-nums">
                    {active! + 1} / {count}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

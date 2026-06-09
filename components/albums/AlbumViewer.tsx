"use client";

import { useState } from "react";

import Image from "next/image";

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
 * YouTube 임베드 + 이미지 그리드(탭 시 큰 이미지). 로그인 회원만 도달(서버 가드).
 */
export function AlbumViewer({
  album,
  images,
}: {
  album: AlbumRow;
  images: AlbumImageRow[];
}) {
  const [active, setActive] = useState<AlbumImageRow | null>(null);

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
          {images.map((img) => (
            <li key={img.id}>
              <button
                type="button"
                className="relative block aspect-square w-full overflow-hidden rounded-md border"
                onClick={() => setActive(img)}
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

      {/* 큰 이미지 다이얼로그 */}
      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-[92vw] p-2 sm:max-w-[640px]">
          <DialogTitle className="sr-only">사진 보기</DialogTitle>
          {active ? (
            <div className="space-y-2">
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={r2PublicUrl(active.image_key)}
                  alt={active.caption ?? "행사 사진"}
                  fill
                  sizes="92vw"
                  className="object-contain"
                />
              </div>
              {active.caption ? (
                <p className="text-center text-sm text-muted-foreground">
                  {active.caption}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

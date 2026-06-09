"use client";

import { useState } from "react";

/**
 * R2 presigned 업로드 클라이언트 훅 (T-154/155 / §9.2).
 *
 * 0) 업로드 전 브라우저에서 자동 압축: scope별 최대 변 길이로 리사이즈 + WebP 인코딩
 *    (스토리지 절약 + 로딩 속도 최적화). gif(애니메이션)는 원본 유지, 압축본이 더 크면 원본 유지.
 * 1) /api/uploads(서버)에서 presigned PUT URL + key 발급(보낼 contentType 으로 서명).
 * 2) 받은 URL 로 파일을 R2 에 직접 PUT(서버 대역폭 0).
 * 3) DB 저장에 쓸 객체 key 를 반환.
 *
 * 브라우저 코드이므로 lib/storage(서버 전용)를 직접 import 하지 않는다(ESLint 차단).
 */

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type UploadScope = "album" | "cover" | "content" | "profile";

/** scope별 최대 변 길이(px). 아바타는 작게, 갤러리는 크게. */
const MAX_DIM: Record<UploadScope, number> = {
  profile: 512,
  cover: 1600,
  content: 1600,
  album: 1920,
};

async function compressImage(
  file: File,
  maxDim: number,
): Promise<{ blob: Blob; contentType: string }> {
  // 애니메이션 보존 위해 gif 는 그대로.
  if (file.type === "image/gif") return { blob: file, contentType: file.type };
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest > maxDim) {
      const s = maxDim / longest;
      width = Math.round(width * s);
      height = Math.round(height * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, contentType: file.type };
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    // 인코딩 실패하거나 오히려 더 크면(이미 작은 이미지) 원본 사용.
    if (!blob || blob.size >= file.size) {
      return { blob: file, contentType: file.type };
    }
    return { blob, contentType: "image/webp" };
  } catch {
    return { blob: file, contentType: file.type };
  }
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(
    file: File,
    scope: UploadScope = "album",
  ): Promise<string | null> {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("jpeg/png/webp/gif 이미지만 업로드할 수 있어요.");
      return null;
    }
    setUploading(true);
    try {
      // 0) 압축(리사이즈 + WebP).
      const { blob, contentType } = await compressImage(file, MAX_DIM[scope]);

      // 1) presigned URL 발급(보낼 contentType 으로 서명).
      const signRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType, scope }),
      });
      const signJson = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        setError(signJson.error ?? "업로드 URL 발급에 실패했어요.");
        return null;
      }

      // 2) R2 직접 PUT(서명된 content-type 과 동일 헤더로).
      const putRes = await fetch(signJson.url, {
        method: "PUT",
        headers: { "content-type": contentType },
        body: blob,
      });
      if (!putRes.ok) {
        setError("이미지 업로드에 실패했어요. (R2 PUT 실패)");
        return null;
      }

      return signJson.key as string;
    } catch {
      setError("네트워크 오류로 업로드에 실패했어요.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, setError };
}

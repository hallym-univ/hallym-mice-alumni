"use client";

import { useState } from "react";

/**
 * R2 presigned 업로드 클라이언트 훅 (T-154/155 / §9.2).
 *
 * 1) /api/uploads(서버, requireAdmin)에서 presigned PUT URL + key 발급.
 * 2) 받은 URL 로 파일을 R2 에 직접 PUT(서버 대역폭 0).
 * 3) DB 저장에 쓸 객체 key 를 반환.
 *
 * 브라우저 코드이므로 lib/storage(서버 전용)를 직접 import 하지 않는다(ESLint 차단).
 */

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(
    file: File,
    scope: "album" | "cover" | "content" = "album",
  ): Promise<string | null> {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("jpeg/png/webp/gif 이미지만 업로드할 수 있어요.");
      return null;
    }
    setUploading(true);
    try {
      // 1) presigned URL 발급.
      const signRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, scope }),
      });
      const signJson = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        setError(signJson.error ?? "업로드 URL 발급에 실패했어요.");
        return null;
      }

      // 2) R2 직접 PUT.
      const putRes = await fetch(signJson.url, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
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

import { randomUUID } from "node:crypto";

import { withAuth } from "@/lib/guards/withAuth";
import { getSignedUploadUrl } from "@/lib/storage";
import { uploadContentTypeSchema } from "@/lib/validators";

/**
 * POST /api/uploads — R2 presigned PUT URL 발급 (T-154 / §6.5-2, §9.2).
 *
 * 관리자만 호출 가능(requireAdmin). 갤러리 이미지는 운영자 큐레이션이므로
 * 사용자 자유 업로드 경로는 만들지 않는다(§6.5-3).
 *
 * 요청 body: { contentType: "image/jpeg" | ... , scope?: "album" | "cover" }
 * 응답: { url, key } — 클라가 url 로 직접 PUT(서버 대역폭 0) 후 key 를 DB 저장에 사용.
 *
 * R2 객체 key 는 서버에서 생성한다(클라가 임의 경로를 지정하지 못하게 함).
 */
export const POST = withAuth(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청 본문이에요." }, { status: 400 });
    }

    const { contentType, scope } = (body ?? {}) as {
      contentType?: unknown;
      scope?: unknown;
    };

    const parsed = uploadContentTypeSchema.safeParse(contentType);
    if (!parsed.success) {
      return Response.json(
        { error: "허용되지 않는 파일 형식이에요(jpeg/png/webp/gif)." },
        { status: 400 },
      );
    }

    const ext = mimeToExt(parsed.data);
    const prefix =
      scope === "cover"
        ? "albums/covers"
        : scope === "content"
          ? "content/covers"
          : "albums/images";
    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      const { url } = await getSignedUploadUrl(key, parsed.data, {
        expiresInSeconds: 60 * 5,
      });
      return Response.json({ url, key });
    } catch (err) {
      console.error("[uploads] presigned 발급 실패", err);
      return Response.json(
        { error: "업로드 URL 발급에 실패했어요. 잠시 후 다시 시도해주세요." },
        { status: 500 },
      );
    }
  },
  { role: "admin" },
);

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

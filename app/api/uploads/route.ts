import { randomUUID } from "node:crypto";

import { withAuth } from "@/lib/guards/withAuth";
import { getSignedUploadUrl } from "@/lib/storage";
import { uploadContentTypeSchema, uploadScopeSchema } from "@/lib/validators";

/**
 * POST /api/uploads — R2 presigned PUT URL 발급 (T-154 / §6.5-2, §9.2).
 *
 * 회원은 본인 프로필 사진(scope: "profile")만 업로드할 수 있다.
 * 운영 자산(album/cover/content)은 관리자만(아래 게이트). 갤러리 이미지는
 * 운영자 큐레이션이므로 사용자 자유 업로드 경로는 만들지 않는다(§6.5-3).
 *
 * 요청 body: { contentType: "image/jpeg" | ... , scope?: "profile" | "album" | "cover" | "content" }
 * 응답: { url, key } — 클라가 url 로 직접 PUT(서버 대역폭 0) 후 key 를 DB 저장에 사용.
 *
 * R2 객체 key 는 서버에서 생성한다(클라가 임의 경로를 지정하지 못하게 함).
 */
export const POST = withAuth(
  async (req, { me }) => {
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

    const scopeParsed = uploadScopeSchema.safeParse(scope ?? "album");
    if (!scopeParsed.success) {
      return Response.json({ error: "허용되지 않는 업로드 범위예요." }, { status: 400 });
    }
    const scopeStr = scopeParsed.data;

    // 회원은 본인 프로필 사진(profile)만, 운영 자산(album/cover/content)은 관리자만.
    if (scopeStr !== "profile" && !me.isAdmin) {
      return Response.json({ error: "권한이 없어요." }, { status: 403 });
    }

    const ext = mimeToExt(parsed.data);
    const prefix =
      scopeStr === "cover"
        ? "albums/covers"
        : scopeStr === "content"
          ? "content/covers"
          : scopeStr === "profile"
            ? "profiles"
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
  { role: "member" },
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

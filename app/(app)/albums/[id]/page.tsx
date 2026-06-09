import Link from "next/link";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/guards/requireMember";
import { AuthError } from "@/lib/guards/withAuth";
import { getPublicAlbum } from "@/lib/albums/public";
import { AlbumViewer } from "@/components/albums/AlbumViewer";
import { EmptyState } from "@/components/common/EmptyState";
import { ERROR } from "@/lib/messages";

/**
 * 회원 갤러리 — 앨범 상세 (§6.5-5 / T-156).
 * 로그인 회원만 열람(서버 가드). 공개 앨범이 아니면 빈/없음 처리.
 */
export const dynamic = "force-dynamic";

export default async function MemberAlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requireMember();
  } catch (err) {
    if (err instanceof AuthError && err.status === 401) {
      redirect(`/login?next=/albums/${id}`);
    }
    redirect("/home");
  }

  const result = await getPublicAlbum(id);

  if (!result) {
    return (
      <section className="px-5 py-6">
        <Link
          href="/albums"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 행사 기록
        </Link>
        <EmptyState
          title={ERROR.notFound.title}
          description="비공개이거나 삭제된 앨범이에요."
          action={{ label: ERROR.notFound.cta, href: "/albums" }}
          className="mt-6"
        />
      </section>
    );
  }

  return (
    <section className="px-5 py-6">
      <Link
        href="/albums"
        className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 행사 기록
      </Link>
      <AlbumViewer album={result.album} images={result.images} />
    </section>
  );
}

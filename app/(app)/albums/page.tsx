import { redirect } from "next/navigation";

import { requireMember } from "@/lib/guards/requireMember";
import { AuthError } from "@/lib/guards/withAuth";
import { listPublicAlbums } from "@/lib/albums/public";
import { AlbumGrid } from "@/components/albums/AlbumGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { EMPTY } from "@/lib/messages";

/**
 * 회원 갤러리 — 공개 앨범 목록 (§6.5-5 / T-156).
 *
 * 열람 권한 = 로그인 회원(비로그인 guest 불가). 미들웨어가 1차로 막지만,
 * 행사 사진(초상권)이라 서버에서도 requireMember 로 2차 가드한다.
 * 공개(is_public=true) 앨범만 노출.
 */
export default async function MemberAlbumsPage() {
  try {
    await requireMember();
  } catch (err) {
    if (err instanceof AuthError && err.status === 401) {
      redirect("/login?next=/albums");
    }
    redirect("/home");
  }

  let albums: Awaited<ReturnType<typeof listPublicAlbums>>;
  try {
    albums = await listPublicAlbums();
  } catch {
    return (
      <section className="px-5 py-6">
        <h1 className="mb-4 text-xl font-bold">행사 기록</h1>
        <ErrorState description="갤러리를 불러오지 못했어요." />
      </section>
    );
  }

  return (
    <section className="px-5 py-6">
      <header className="mb-4 space-y-1">
        <h1 className="text-xl font-bold">행사 기록</h1>
        <p className="text-sm text-muted-foreground">
          동문 행사의 사진과 영상을 모았어요.
        </p>
      </header>

      {albums.length === 0 ? (
        <EmptyState
          title={EMPTY.galleryNoAlbums.title}
          description={EMPTY.galleryNoAlbums.cta}
        />
      ) : (
        <AlbumGrid albums={albums} />
      )}
    </section>
  );
}

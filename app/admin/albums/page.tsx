import { AlbumsManager } from "@/components/albums/AlbumsManager";

/**
 * 운영자 갤러리 관리 (§6.5 / T-155).
 * layout 의 requireAdmin 가드로 접근이 보장된다.
 * 앨범 목록 + 새 앨범 생성. 상세 편집은 /admin/albums/:id.
 */
export const dynamic = "force-dynamic";

export default function AdminAlbumsPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">갤러리</h1>
        <p className="text-sm text-muted-foreground">
          운영자가 큐레이션하는 행사 앨범을 관리하세요. 사용자 자유 업로드는 없습니다.
        </p>
      </header>
      <AlbumsManager />
    </section>
  );
}

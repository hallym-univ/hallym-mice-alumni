import Link from "next/link";

import { AlbumEditor } from "@/components/albums/AlbumEditor";

/**
 * 운영자 단일 앨범 편집 (§6.5 / T-155).
 * layout 의 requireAdmin 가드로 접근이 보장된다.
 */
export const dynamic = "force-dynamic";

export default async function AdminAlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <Link
        href="/admin/albums"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 앨범 목록
      </Link>
      <AlbumEditor albumId={id} />
    </section>
  );
}

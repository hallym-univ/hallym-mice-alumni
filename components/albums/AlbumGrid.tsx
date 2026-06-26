import Image from "next/image";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { GradientCover } from "@/components/common/GradientCover";
import { Badge } from "@/components/ui/badge";
import { r2PublicUrl } from "@/lib/utils";
import type { PublicAlbumListItem } from "@/lib/albums/types";

/**
 * 회원 갤러리 — 공개 앨범 카드 그리드 (T-156 / §6.5).
 * 대표 이미지 + 제목 + 행사일. 클릭 시 상세로.
 * 서버 컴포넌트(데이터는 상위 server component 에서 주입). r2PublicUrl 은 공개값 기반.
 */
export function AlbumGrid({ albums }: { albums: PublicAlbumListItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {albums.map((a) => (
        <li key={a.id}>
          <Link href={`/albums/${a.id}`}>
            <Card className="group overflow-hidden transition-colors hover:bg-accent">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {a.cover_image_key ? (
                  <Image
                    src={r2PublicUrl(a.cover_image_key)}
                    alt={a.title}
                    fill
                    sizes="(max-width: 480px) 50vw, 240px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <GradientCover
                    seed={a.id}
                    label={a.title}
                    className="absolute inset-0 h-full w-full"
                  />
                )}
              </div>
              <CardContent className="p-3">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.event_date ?? "행사일 미정"}
                </p>
                {(a.hashtags ?? []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(a.hashtags ?? []).slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="px-2 py-0 text-[11px]">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

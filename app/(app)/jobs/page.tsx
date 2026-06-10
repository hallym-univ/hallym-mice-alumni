import Link from "next/link";

import { Bookmark, Plus } from "lucide-react";

import { JobsBoard } from "@/components/jobs/JobsBoard";
import { Button } from "@/components/ui/button";
import { requireMemberPage } from "@/lib/guards/page";
import { listPublishedJobs } from "@/lib/jobs/queries";
import { getTagsMaster } from "@/lib/tags/queries";
import type { TagRow } from "@/types/database";

/**
 * 구인구직 보드 (§6.4 / 하단 탭 "기회").
 * 첫 페이지 데이터를 서버에서 미리 조회해 주입(마운트 후 API 재호출 폭포 제거).
 * 필터·검색·무한 스크롤은 기존 /api/jobs 경로 그대로.
 */
export default async function JobsPage() {
  const me = await requireMemberPage("/jobs");

  // 서버 조회 실패 시 initialData=undefined → 컴포넌트가 기존 클라이언트
  // fetch 경로(인라인 ErrorState + 재시도)로 폴백한다(페이지 전체 500 방지).
  const [tags, initialData] = await Promise.all([
    getTagsMaster(),
    listPublishedJobs(me, {}).catch(() => undefined),
  ]);

  return (
    <section>
      <header className="px-5 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">기회</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              동문이 올린 채용·공모·프로젝트 공고
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" />
              올리기
            </Link>
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/jobs/mine">내 공고</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/jobs/bookmarks">
              <Bookmark className="h-4 w-4" />
              저장
            </Link>
          </Button>
        </div>
      </header>
      <JobsBoard tags={tags as TagRow[]} initialData={initialData} />
    </section>
  );
}

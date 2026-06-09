import Link from "next/link";

import { Bookmark, Plus } from "lucide-react";

import { JobsBoard } from "@/components/jobs/JobsBoard";
import { Button } from "@/components/ui/button";
import { requireMemberPage } from "@/lib/guards/page";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TagRow } from "@/types/database";

/**
 * 구인구직 보드 (§6.4 / 하단 탭 "기회").
 * 서버에서 회원 가드 후 태그 마스터를 주입하고, 목록은 클라가 /api/jobs 로 페이징한다.
 */
export default async function JobsPage() {
  await requireMemberPage("/jobs");

  const admin = createAdminClient();
  const { data: tags } = await admin
    .from("tags")
    .select("id,name,category")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <section>
      <header className="flex items-start justify-between gap-2 px-5 pt-5">
        <div>
          <h1 className="text-xl font-bold">기회</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            동문이 올린 채용·공모·프로젝트 공고
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="icon" aria-label="저장한 공고">
            <Link href="/jobs/bookmarks">
              <Bookmark className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" />
              올리기
            </Link>
          </Button>
        </div>
      </header>
      <JobsBoard tags={(tags ?? []) as TagRow[]} />
    </section>
  );
}

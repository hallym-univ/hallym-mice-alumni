import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { requireMemberPage } from "@/lib/guards/page";
import { listBookmarkedJobs } from "@/lib/jobs/queries";
import { EMPTY } from "@/lib/messages";

/** 저장한 공고 (§6.4). 내가 북마크한 게시중/마감 공고 목록. */
export default async function BookmarkedJobsPage() {
  const me = await requireMemberPage("/jobs/bookmarks");
  const jobs = await listBookmarkedJobs(me);

  return (
    <div className="pb-8">
      <header className="flex items-center gap-2 px-5 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로">
          <Link href="/jobs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold">저장한 공고</h1>
      </header>
      <div className="px-5">
        {jobs.length === 0 ? (
          <EmptyState
            title={EMPTY.bookmarksEmpty.title}
            description={EMPTY.bookmarksEmpty.cta}
            action={{ label: "공고 보러가기", href: "/jobs" }}
          />
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

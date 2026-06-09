import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { JobEditor } from "@/components/jobs/JobEditor";
import { Button } from "@/components/ui/button";
import { requireMemberPage } from "@/lib/guards/page";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TagRow } from "@/types/database";

/** 공고 올리기 (§6.4). 등록 시 status=pending → 운영진 승인 후 게시. */
export default async function NewJobPage() {
  await requireMemberPage("/jobs/new");

  const admin = createAdminClient();
  const { data: tags } = await admin
    .from("tags")
    .select("id,name,category")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="px-5 py-5">
      <header className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로">
          <Link href="/jobs">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold">공고 올리기</h1>
      </header>
      <JobEditor tags={(tags ?? []) as TagRow[]} />
    </div>
  );
}

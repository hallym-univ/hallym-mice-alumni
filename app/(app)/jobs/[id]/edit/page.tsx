import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { JobEditor } from "@/components/jobs/JobEditor";
import { Button } from "@/components/ui/button";
import { requireMemberPage } from "@/lib/guards/page";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JobRow, TagRow } from "@/types/database";

/** 공고 수정 (§6.4). 작성자 또는 관리자만. 공개/대기 공고는 수정 후 공개 상태를 유지한다. */
type JobEditorSource = Pick<
  JobRow,
  | "id"
  | "author_id"
  | "title"
  | "organization"
  | "job_type"
  | "location"
  | "deadline"
  | "compensation"
  | "description"
  | "requirements"
  | "apply_url"
  | "contact"
>;

const JOB_EDITOR_COLS =
  "id,author_id,title,organization,job_type,location,deadline,compensation,description,requirements,apply_url,contact";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireMemberPage(`/jobs/${id}/edit`);

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select(JOB_EDITOR_COLS)
    .eq("id", id)
    .maybeSingle<JobEditorSource>();

  if (!job || (job.author_id !== me.profile.id && !me.isAdmin)) {
    redirect(`/jobs/${id}`);
  }

  const [{ data: jt }, { data: tags }] = await Promise.all([
    admin.from("job_tags").select("tag_id").eq("job_id", id),
    admin
      .from("tags")
      .select("id,name,category")
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const initial = {
    id: job.id,
    title: job.title,
    organization: job.organization,
    job_type: job.job_type,
    location: job.location ?? "",
    deadline: job.deadline ?? "",
    compensation: job.compensation ?? "",
    description: job.description,
    requirements: job.requirements ?? "",
    apply_url: job.apply_url ?? "",
    contact: job.contact ?? "",
    tag_ids: (jt ?? []).map((t) => t.tag_id),
  };

  return (
    <div className="px-5 py-5">
      <header className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로">
          <Link href={`/jobs/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold">공고 수정</h1>
      </header>
      <JobEditor tags={(tags ?? []) as TagRow[]} initial={initial} />
    </div>
  );
}

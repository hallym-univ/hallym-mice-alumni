"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EMPTY } from "@/lib/messages";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, JOB_TYPE_LABEL } from "@/lib/labels";
import type { JobRow, JobStatus } from "@/types/database";

/**
 * 공고 승인/관리 (§6.4 / §6.7). 상태 큐 + 승인/숨김/마감 전이.
 * 데이터 접근은 /api/admin/jobs(서버, requireAdmin)로만.
 */
type JobWithAuthor = Pick<
  JobRow,
  "id" | "title" | "organization" | "job_type" | "status"
> & {
  author_name: string | null;
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "pending", label: "승인 대기" },
  { value: "published", label: "게시중" },
  { value: "closed", label: "마감" },
  { value: "hidden", label: "숨김" },
  { value: "all", label: "전체" },
];

export function JobsManager({ initialStatus }: { initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [jobs, setJobs] = useState<JobWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/jobs?status=${encodeURIComponent(status)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setJobs(json.jobs ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(jobId: string, next: JobStatus) {
    setBusyId(jobId);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(json.error ?? "처리에 실패했어요.");
        return;
      }
      await load();
    } catch {
      setActionError("네트워크 오류가 발생했어요.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          새로고침
        </Button>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title={EMPTY.adminNoTasks.title}
          description={EMPTY.adminNoTasks.cta}
        />
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <Card key={j.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">
                    <Badge variant="outline" className="mr-2">
                      {JOB_TYPE_LABEL[j.job_type]}
                    </Badge>
                    {j.title}
                  </CardTitle>
                  <Badge variant={JOB_STATUS_TONE[j.status]}>
                    {JOB_STATUS_LABEL[j.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {j.organization}
                  {j.author_name ? ` · ${j.author_name}` : ""}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/jobs/${j.id}`}>보기</Link>
                  </Button>
                  {j.status === "pending" ? (
                    <Button
                      size="sm"
                      disabled={busyId === j.id}
                      onClick={() => void transition(j.id, "published")}
                    >
                      승인·게시
                    </Button>
                  ) : null}
                  {j.status !== "published" && j.status !== "pending" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === j.id}
                      onClick={() => void transition(j.id, "published")}
                    >
                      게시
                    </Button>
                  ) : null}
                  {j.status === "published" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === j.id}
                      onClick={() => void transition(j.id, "closed")}
                    >
                      마감
                    </Button>
                  ) : null}
                  {j.status !== "hidden" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === j.id}
                      onClick={() => void transition(j.id, "hidden")}
                    >
                      숨김
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

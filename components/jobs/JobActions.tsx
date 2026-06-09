"use client";

import { useState } from "react";

import { ExternalLink, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { BookmarkButton } from "./BookmarkButton";

/**
 * 공고 상세 액션 (§6.4). 지원(외부 링크, job_apply_click 기록) + 북마크 + 신고.
 * 지원 URL 이 없으면 담당자 연락처를 안내한다.
 */
export function JobActions({
  jobId,
  applyUrl,
  contact,
  isBookmarked,
  isClosed,
}: {
  jobId: string;
  applyUrl: string | null;
  contact: string | null;
  isBookmarked: boolean;
  isClosed: boolean;
}) {
  const [reportOpen, setReportOpen] = useState(false);

  async function onApply() {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventType: "job_apply_click", targetId: jobId }),
      });
    } catch {
      // 이벤트 실패는 지원을 막지 않는다.
    }
    if (applyUrl) window.open(applyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-2">
      {applyUrl ? (
        <Button
          className="w-full"
          size="lg"
          onClick={onApply}
          disabled={isClosed}
        >
          <ExternalLink className="h-4 w-4" />
          {isClosed ? "마감된 공고예요" : "지원하러 가기"}
        </Button>
      ) : contact ? (
        <p className="rounded-md border px-3 py-2 text-center text-sm">
          문의: <span className="font-medium">{contact}</span>
        </p>
      ) : (
        <p className="rounded-md border px-3 py-2 text-center text-sm text-muted-foreground">
          지원 방법이 안내되지 않았어요.
        </p>
      )}

      <div className="flex gap-2">
        <BookmarkButton
          jobId={jobId}
          initial={isBookmarked}
          variant="outline"
          size="default"
          showLabel
          className="flex-1"
        />
        <Button
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={() => setReportOpen(true)}
        >
          <Flag className="h-4 w-4" />
          신고
        </Button>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} jobId={jobId} />
    </div>
  );
}

function ReportDialog({
  open,
  onOpenChange,
  jobId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
}) {
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target_type: "job", target_id: jobId, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "신고에 실패했어요.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("신고에 실패했어요.");
      setState("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setState("idle");
          setReason("");
          setError(null);
        }
      }}
    >
      <DialogContent>
        {state === "done" ? (
          <>
            <DialogHeader>
              <DialogTitle>신고가 접수됐어요</DialogTitle>
              <DialogDescription>
                운영진이 검토 후 처리할게요. 신고해주셔서 감사해요.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>닫기</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>이 공고 신고</DialogTitle>
              <DialogDescription>
                부적절한 사유를 적어주세요(선택). 운영진이 검토해요.
              </DialogDescription>
            </DialogHeader>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="신고 사유 (선택)"
              rows={4}
              maxLength={500}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={submit}
                disabled={state === "sending"}
              >
                {state === "sending" ? "접수 중..." : "신고하기"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

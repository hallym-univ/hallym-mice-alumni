"use client";

import { useState } from "react";

import { Flag } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { ReportTargetType } from "@/types/database";

export function ReportButton({
  targetType,
  targetId,
  label = "신고",
  compact = false,
}: {
  targetType: Extract<ReportTargetType, "post" | "comment">;
  targetId: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
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
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
        }),
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

  function close(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setReason("");
      setState("idle");
      setError(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "sm" : "default"}
        className={compact ? "h-auto px-1 py-0 text-xs text-muted-foreground" : undefined}
        onClick={() => setOpen(true)}
      >
        {compact ? null : <Flag className="h-4 w-4" />}
        {label}
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          {state === "done" ? (
            <>
              <DialogHeader>
                <DialogTitle>신고가 접수됐어요</DialogTitle>
                <DialogDescription>
                  운영진이 검토 후 필요한 조치를 할게요.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => close(false)}>닫기</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{label}</DialogTitle>
                <DialogDescription>
                  부적절한 내용, 개인정보 노출, 스팸 등을 알려주세요.
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="신고 사유 (선택)"
                rows={4}
                maxLength={500}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => close(false)}>
                  취소
                </Button>
                <Button onClick={submit} disabled={state === "sending"}>
                  {state === "sending" ? "접수 중..." : "신고하기"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

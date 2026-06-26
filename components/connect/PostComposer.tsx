"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AttachedContentCard } from "@/components/connect/AttachedContentCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { POST_TYPE_OPTIONS } from "@/lib/labels";
import type { PostType } from "@/types/database";

export interface ImportableContent {
  id: string;
  label: string;
  kindLabel: string;
  title: string;
  body: string | null;
  postType: PostType;
  href: string;
}

export function PostComposer({
  importableItems = [],
}: {
  importableItems?: ImportableContent[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<PostType>("story");
  const [selectedContentId, setSelectedContentId] = useState("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedContent =
    importableItems.find((candidate) => candidate.id === selectedContentId) ?? null;

  function applyInternalContent(value: string) {
    if (value === "none") {
      setSelectedContentId("none");
      return;
    }
    const item = importableItems.find((candidate) => candidate.id === value);
    if (!item) return;
    setSelectedContentId(item.id);
    setPostType(item.postType);
  }

  async function submit() {
    const normalizedBody = body.trim();

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: normalizedBody,
          post_type: postType,
          external_url: selectedContent?.href ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "게시글 저장에 실패했어요.");
        return;
      }
      setBody("");
      setPostType("story");
      setSelectedContentId("none");
      router.refresh();
    } catch {
      setError("게시글 저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          selectedContent
            ? "전할 말을 덧붙여보세요. (선택)"
            : "동문에게 공유할 경험, 질문, 프로젝트 모집, 행사 소식을 적어보세요."
        }
        rows={selectedContent ? 3 : 4}
        maxLength={3000}
      />

      {selectedContent ? (
        <AttachedContentCard
          item={{
            href: selectedContent.href,
            kindLabel: selectedContent.kindLabel,
            title: selectedContent.title,
            description: selectedContent.body,
          }}
          className="bg-background"
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedContentId("none")}
              aria-label="첨부 제거"
            >
              <X className="h-4 w-4" />
            </Button>
          }
        />
      ) : null}

      <div className="flex items-center gap-2">
        <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
          <SelectTrigger className="h-8 w-[116px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POST_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedContentId} onValueChange={applyInternalContent}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <span className="truncate">
              {selectedContent ? `${selectedContent.kindLabel} 첨부됨` : "콘텐츠 첨부"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">첨부 안 함</SelectItem>
            {importableItems.length > 0 ? (
              importableItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="empty" disabled>
                가져올 콘텐츠가 없어요
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div />
        <Button onClick={submit} disabled={busy || (!body.trim() && !selectedContent)}>
          <Send className="h-4 w-4" />
          {busy ? "등록 중" : "등록"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

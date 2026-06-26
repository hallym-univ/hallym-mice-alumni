"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { Paperclip, Send, X } from "lucide-react";

import {
  AttachedContentCard,
  type AttachedContentPreview,
} from "@/components/connect/AttachedContentCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
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
  const postTypeLabel =
    POST_TYPE_OPTIONS.find((option) => option.value === postType)?.label ?? "경험 공유";
  const selectedAttachment: AttachedContentPreview | null = selectedContent
    ? {
        href: selectedContent.href,
        kindLabel: selectedContent.kindLabel,
        title: selectedContent.title,
        description: selectedContent.body,
      }
    : null;

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
            ? "첨부와 함께 남길 코멘트를 적어보세요. (선택)"
            : "동문에게 공유할 경험, 질문, 프로젝트 모집, 행사 소식을 적어보세요."
        }
        rows={selectedContent ? 3 : 4}
        maxLength={3000}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {selectedContent ? (
            <span className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
              {postTypeLabel}
            </span>
          ) : (
            <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
              <SelectTrigger className="h-8 w-[108px] text-xs">
                <span className="truncate">{postTypeLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {POST_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {importableItems.length > 0 ? (
            <Select value={selectedContentId} onValueChange={applyInternalContent}>
              <SelectTrigger className="h-8 w-auto max-w-[190px] gap-1.5 border-transparent bg-transparent px-2.5 text-xs text-muted-foreground shadow-none hover:bg-muted focus:ring-1 focus:ring-ring focus:ring-offset-0">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {selectedContent ? "첨부 변경" : "관련 콘텐츠 첨부"}
                </span>
              </SelectTrigger>
              <SelectContent className="w-[calc(100vw-2rem)] max-w-[360px]">
                <SelectItem value="none">첨부 없이 작성</SelectItem>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-xs text-muted-foreground">
                    플랫폼 콘텐츠
                  </SelectLabel>
                  {importableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="line-clamp-1">
                        {item.kindLabel} · {item.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <Button
          className="ml-auto"
          onClick={submit}
          disabled={busy || (!body.trim() && !selectedContent)}
        >
          <Send className="h-4 w-4" />
          {busy ? "등록 중" : "등록"}
        </Button>
      </div>

      {selectedAttachment ? (
        <AttachedContentCard
          item={selectedAttachment}
          compact
          className="border-dashed bg-muted/15"
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedContentId("none")}
              aria-label="첨부 제거"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          }
        />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

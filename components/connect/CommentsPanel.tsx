"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Avatar } from "@/components/profile/Avatar";
import { ReportButton } from "@/components/connect/ReportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CommentItem {
  id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}

export function CommentsPanel({
  postId,
  commentCount,
}: {
  postId: string;
  commentCount: number;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CommentItem[]>([]);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (loaded || loading) return;
    if (commentCount === 0) {
      setLoaded(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems(data.items ?? []);
        setLoaded(true);
      }
    } catch {
      // 댓글 로드 실패는 작성 흐름을 막지 않는다.
    } finally {
      setLoading(false);
    }
  }, [commentCount, loaded, loading, postId]);

  const openPanel = useCallback(() => {
    setOpen(true);
    void loadComments();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [loadComments]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;

    node.addEventListener("connect:open-comments", openPanel);
    return () => {
      node.removeEventListener("connect:open-comments", openPanel);
    };
  }, [openPanel]);

  useEffect(() => {
    setItems([]);
    setBody("");
    setOpen(false);
    setLoaded(false);
    setLoading(false);
    setError(null);
  }, [postId]);

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "댓글 저장에 실패했어요.");
        return;
      }
      setBody("");
      const fresh = await fetch(`/api/posts/${postId}/comments`).then((r) => r.json());
      setItems(fresh.items ?? []);
      setLoaded(true);
      router.refresh();
    } catch {
      setError("댓글 저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      id={`comments-${postId}`}
      ref={rootRef}
      className="space-y-3 border-t pt-3"
    >
      {!open ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={openPanel}
        >
          {commentCount > 0 ? `댓글 ${commentCount}개 보기` : "댓글 남기기"}
        </Button>
      ) : null}

      {open && loading ? (
        <p className="text-xs text-muted-foreground">댓글을 불러오는 중...</p>
      ) : null}

      {open && !loading && loaded && items.length === 0 && commentCount > 0 ? (
        <p className="text-xs text-muted-foreground">표시할 댓글이 없어요.</p>
      ) : null}

      {open ? (
        <>
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar
                    src={comment.author?.photo_url ?? null}
                    name={comment.author?.name ?? "동문"}
                    size={28}
                  />
                  <div className="min-w-0 rounded-md bg-muted px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">
                        {comment.author?.name ?? "동문"}
                      </p>
                      <ReportButton
                        targetType="comment"
                        targetId={comment.id}
                        label="신고"
                        compact
                      />
                    </div>
                    <p className="text-sm">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="댓글을 남겨보세요"
              maxLength={1000}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <Button size="icon" onClick={submit} disabled={busy || !body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </>
      ) : null}
    </div>
  );
}

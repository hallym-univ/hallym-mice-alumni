"use client";

import { useEffect, useState } from "react";

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

export function CommentsPanel({ postId }: { postId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
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
      router.refresh();
    } catch {
      setError("댓글 저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id={`comments-${postId}`} className="space-y-3 border-t pt-3">
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.slice(0, 5).map((comment) => (
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
    </div>
  );
}

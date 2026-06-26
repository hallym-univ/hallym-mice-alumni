"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReactionBar({
  postId,
  likeCount,
  commentCount,
  isLiked,
  shareUrl,
}: {
  postId: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  shareUrl: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likeCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(isLiked);
    setLikes(likeCount);
  }, [isLiked, likeCount]);

  async function toggleLike() {
    if (busy) return;

    const nextLiked = !liked;
    setBusy(true);
    setLiked(nextLiked);
    setLikes((count) => count + (nextLiked ? 1 : -1));

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: nextLiked ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setLiked(!nextLiked);
        setLikes((count) => count + (nextLiked ? -1 : 1));
        return;
      }
      router.refresh();
    } catch {
      setLiked(!nextLiked);
      setLikes((count) => count + (nextLiked ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = shareUrl.startsWith("http")
      ? shareUrl
      : new URL(shareUrl, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  function openComments() {
    const panel = document.getElementById(`comments-${postId}`);
    panel?.dispatchEvent(new CustomEvent("connect:open-comments"));
    panel?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex items-center justify-between border-t pt-3">
      <Button type="button" variant="ghost" size="sm" onClick={toggleLike}>
        <Heart className={liked ? "fill-primary text-primary" : ""} />
        {likes}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={openComments}
      >
        <MessageCircle />
        {commentCount}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={share}>
        <Share2 />
        공유
      </Button>
    </div>
  );
}

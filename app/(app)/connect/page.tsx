import Link from "next/link";

import { ExternalLink, Link2, Search } from "lucide-react";

import { CommentsPanel } from "@/components/connect/CommentsPanel";
import { PostComposer, type ImportableContent } from "@/components/connect/PostComposer";
import { ReactionBar } from "@/components/connect/ReactionBar";
import { ReportButton } from "@/components/connect/ReportButton";
import { Avatar } from "@/components/profile/Avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireMemberPage } from "@/lib/guards/page";
import { listPublicAlbums } from "@/lib/albums/public";
import { listPublishedArticles } from "@/lib/content/public";
import { listPublishedPosts, type PostListItem } from "@/lib/connect/queries";
import { listPublishedJobs } from "@/lib/jobs/queries";
import { formatDate, JOB_TYPE_LABEL, POST_TYPE_LABEL } from "@/lib/labels";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams)?.q ?? "").trim();
  const me = await requireMemberPage("/connect");
  const [postsRaw, articles, jobsRes, albums] = await Promise.all([
    listPublishedPosts(me, 30).catch(() => []),
    listPublishedArticles(12).catch(() => []),
    listPublishedJobs(me, { limit: 12 }).catch(() => ({ items: [] })),
    listPublicAlbums(12).catch(() => []),
  ]);

  const posts = q ? postsRaw.filter((post) => matchesPost(post, q)) : postsRaw;
  const importableItems = buildImportableItems(articles, jobsRes.items, albums).filter(
    (item) => !q || matchesText([item.title, item.body, item.label], q),
  );

  return (
    <div className="space-y-5 px-5 py-5">
      <header>
        <p className="text-sm text-muted-foreground">동문의 활동을 발견하는</p>
        <h1 className="text-2xl font-bold tracking-tight">커넥트</h1>
      </header>

      <section className="space-y-3">
        <form className="relative" action="/connect">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="게시글, 기회, 행사, 작성자 검색"
            className="pl-9"
          />
        </form>
        <PostComposer importableItems={importableItems} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">업데이트 피드</h2>
          <Badge variant="secondary">게시글 기반</Badge>
        </div>

        {posts.map((post) => (
          <PostFeedCard key={post.id} post={post} />
        ))}

        {q && posts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            검색어와 일치하는 게시글이 없어요.
          </p>
        ) : null}
        {!q && posts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            아직 올라온 게시글이 없어요.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function buildImportableItems(
  articles: Awaited<ReturnType<typeof listPublishedArticles>>,
  jobs: Awaited<ReturnType<typeof listPublishedJobs>>["items"],
  albums: Awaited<ReturnType<typeof listPublicAlbums>>,
): ImportableContent[] {
  return [
    ...articles.map((item) => ({
      id: `article-${item.id}`,
      label: `동문 이야기 · ${item.title}`,
      title: item.title,
      body: item.summary,
      href: `/content/${item.id}`,
      postType: "story" as const,
    })),
    ...jobs.map((item) => ({
      id: `job-${item.id}`,
      label: `기회 · ${item.title}`,
      title: item.title,
      body: `${item.organization}${item.location ? ` · ${item.location}` : ""}\n${JOB_TYPE_LABEL[item.job_type]}`,
      href: `/jobs/${item.id}`,
      postType: "project" as const,
    })),
    ...albums.map((item) => ({
      id: `album-${item.id}`,
      label: `행사 기록 · ${item.title}`,
      title: item.title,
      body: item.description ?? "행사 사진과 기록이 업데이트되었어요.",
      href: `/albums/${item.id}`,
      postType: "event" as const,
    })),
  ];
}

function matchesPost(post: PostListItem, q: string) {
  return matchesText(
    [
      post.title,
      post.body,
      post.author?.name,
      post.author?.organization,
      post.author?.position,
      ...post.tags.map((tag) => tag.name),
    ],
    q,
  );
}

function matchesText(values: Array<string | null | undefined>, q: string) {
  const needle = q.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

function PostFeedCard({ post }: { post: PostListItem }) {
  const shareUrl = `/connect?post=${post.id}`;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <Avatar
          src={post.author?.photo_url ?? null}
          name={post.author?.name ?? "동문"}
          size={40}
        />
        <div className="min-w-0 flex-1">
          {post.author ? (
            <Link href={`/alumni/${post.author.id}`} className="font-semibold">
              {post.author.name}
            </Link>
          ) : (
            <p className="font-semibold">동문</p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {[post.author?.organization, post.author?.position].filter(Boolean).join(" · ") ||
              POST_TYPE_LABEL[post.post_type]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="secondary">{POST_TYPE_LABEL[post.post_type]}</Badge>
          <ReportButton targetType="post" targetId={post.id} label="게시글 신고" compact />
        </div>
      </div>

      {post.body ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
      ) : null}

      {post.external_url ? (
        <PostAttachment href={post.external_url} title={post.title} />
      ) : null}

      {post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
      <ReactionBar
        postId={post.id}
        likeCount={post.like_count}
        commentCount={post.comment_count}
        isLiked={post.is_liked}
        shareUrl={shareUrl}
      />
      <CommentsPanel postId={post.id} />
    </Card>
  );
}

function PostAttachment({ href, title }: { href: string; title: string }) {
  const isInternal = href.startsWith("/");
  const label = getAttachmentLabel(href);
  const content = (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-accent/50">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" />
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
        {isInternal ? null : <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
    </div>
  );

  return isInternal ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {content}
    </a>
  );
}

function getAttachmentLabel(href: string) {
  if (href.startsWith("/content/")) return "동문 이야기";
  if (href.startsWith("/jobs/")) return "기회";
  if (href.startsWith("/albums/")) return "행사 기록";
  return "링크";
}

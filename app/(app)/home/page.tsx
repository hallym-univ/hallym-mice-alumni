import Link from "next/link";

import {
  Briefcase,
  ChevronRight,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import { ProfileCard } from "@/components/alumni/ProfileCard";
import { JobCard } from "@/components/jobs/JobCard";
import { ArticleCard } from "@/components/content/ArticleCard";
import { AlbumGrid } from "@/components/albums/AlbumGrid";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { requireMemberPage } from "@/lib/guards/page";
import { listDirectory } from "@/lib/profile/queries";
import { listPublishedJobs } from "@/lib/jobs/queries";
import { listPublishedArticles } from "@/lib/content/public";
import { listPublicAlbums } from "@/lib/albums/public";
import { listPublishedPosts, type PostListItem } from "@/lib/connect/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST_TYPE_LABEL, formatDate } from "@/lib/labels";
import type { PublicProfileCard } from "@/lib/profile/visibility";
import type { ProfileRow } from "@/types/database";

/**
 * 홈 — 콘텐츠 허브 (§6.6 / §11).
 * 네트워크 현황 대시보드 + 새 게시글 + 새로운 기회 + 동문 이야기 + 추천 동문 + 행사 기록.
 */
export default async function HomePage() {
  const me = await requireMemberPage("/home");
  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    alumniCountRes,
    coffeechatCountRes,
    recentProfileRes,
    postCountRes,
    directory,
    jobsRes,
    posts,
    articles,
    albums,
  ] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("is_public", true)
        .is("deleted_at", null),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("is_public", true)
        .in("coffeechat_status", ["open", "monthly"])
        .is("deleted_at", null),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("is_public", true)
        .gte("updated_at", since)
        .is("deleted_at", null),
      admin
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      listDirectory(me, { limit: 12 }),
      listPublishedJobs(me, { limit: 3 }),
      listPublishedPosts(me, 3).catch(() => []),
      listPublishedArticles(3),
      listPublicAlbums(4),
    ]);

  const recommended = directory.items
    .filter((p) => p.id !== me.profile.id)
    .slice(0, 9);
  const recommendationGroups = makeRecommendationGroups(me.profile, recommended);
  const latestJobs = jobsRes.items.slice(0, 3);
  const latestPosts = posts.slice(0, 3);
  const latestArticles = articles.slice(0, 3);
  const recentAlbums = albums.slice(0, 4);

  return (
    <div className="space-y-9 px-5 py-6">
      <header>
        <p className="text-sm text-muted-foreground">이번 주 한림 MICE 네트워크</p>
        <h1 className="text-2xl font-bold tracking-tight">{me.profile.name} 님</h1>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat href="/alumni" icon={Users} label="가입 동문" value={alumniCountRes.count ?? 0} />
          <Stat
            href="/alumni"
            icon={MessageCircle}
            label="커피챗 가능"
            value={coffeechatCountRes.count ?? 0}
          />
          <Stat
            href="/jobs"
            icon={Briefcase}
            label="진행 중 기회"
            value={jobsRes.total ?? latestJobs.length}
          />
          <Stat
            href="/connect"
            icon={MessagesSquare}
            label="새 게시글"
            value={postCountRes.count ?? latestPosts.length}
          />
          <Stat
            href="/alumni"
            icon={RefreshCw}
            label="최근 업데이트"
            value={recentProfileRes.count ?? 0}
            className="col-span-2"
          />
        </div>
      </header>

      {latestPosts.length > 0 ? (
        <Section title="새 게시글" href="/connect">
          <div className="space-y-3">
            {latestPosts.map((post) => (
              <PostPreview key={post.id} post={post} />
            ))}
          </div>
        </Section>
      ) : null}

      {latestJobs.length > 0 ? (
        <Section title="새로운 기회" href="/jobs">
          <div className="space-y-3">
            {latestJobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </Section>
      ) : null}

      {latestArticles.length > 0 ? (
        <Section title="동문 이야기" href="/content">
          <div className="space-y-3">
            {latestArticles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="추천 동문" href="/alumni" accent>
        {recommendationGroups.length === 0 ? (
          <EmptyState
            title="아직 추천할 동문이 없어요"
            description="프로필을 채우면 더 많은 동문이 모여요"
          />
        ) : (
          <div className="space-y-5">
            {recommendationGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <div>
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <p className="text-xs text-muted-foreground">{group.reason}</p>
                </div>
                <div className="space-y-3">
                  {group.items.map((p) => (
                    <ProfileCard key={p.id} profile={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {recentAlbums.length > 0 ? (
        <Section title="행사 기록" href="/albums">
          <AlbumGrid albums={recentAlbums} />
        </Section>
      ) : null}
    </div>
  );
}

function Stat({
  href,
  icon: Icon,
  label,
  value,
  className,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      <Card className="h-full p-4 transition-colors hover:bg-accent/40">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      </Card>
    </Link>
  );
}

function Section({
  title,
  href,
  accent = false,
  children,
}: {
  title: string;
  href: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
          {accent ? <Sparkles className="h-4 w-4 text-primary" /> : null}
          {title}
        </h2>
        <Link
          href={href}
          className="flex items-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          전체 보기
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function PostPreview({ post }: { post: PostListItem }) {
  return (
    <Link href="/connect">
      <Card className="p-4 transition-colors hover:bg-accent/40">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{POST_TYPE_LABEL[post.post_type]}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(post.created_at)}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-1 font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
        {post.author ? (
          <p className="mt-2 text-xs text-muted-foreground">{post.author.name}</p>
        ) : null}
      </Card>
    </Link>
  );
}

function makeRecommendationGroups(
  me: ProfileRow,
  profiles: PublicProfileCard[],
) {
  const used = new Set<string>();
  const groups: Array<{
    title: string;
    reason: string;
    items: PublicProfileCard[];
  }> = [];

  function take(
    title: string,
    reason: string,
    predicate: (profile: PublicProfileCard) => boolean,
  ) {
    const items = profiles
      .filter((profile) => !used.has(profile.id) && predicate(profile))
      .slice(0, 2);
    if (items.length === 0) return;
    for (const item of items) used.add(item.id);
    groups.push({ title, reason, items });
  }

  take(
    "커피챗 가능한 동문",
    "바로 대화를 시작하기 좋은 동문이에요.",
    (profile) =>
      profile.coffeechat_status === "open" || profile.coffeechat_status === "monthly",
  );

  take(
    "비슷한 기수의 동문",
    "입학·졸업 시기가 가까워 연결 맥락이 좋아요.",
    (profile) =>
      Boolean(me.graduation_year && profile.graduation_year === me.graduation_year) ||
      Boolean(me.admission_year && profile.admission_year === me.admission_year),
  );

  take(
    "최근 업데이트한 동문",
    "최근 프로필을 다듬은 활동 신호가 있는 동문이에요.",
    () => true,
  );

  return groups;
}

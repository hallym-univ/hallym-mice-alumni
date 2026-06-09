import Link from "next/link";

import { Briefcase, ChevronRight, FileText, Images, Sparkles } from "lucide-react";

import { ProfileCard } from "@/components/alumni/ProfileCard";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { requireMemberPage } from "@/lib/guards/page";
import { listDirectory } from "@/lib/profile/queries";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 홈 (§6.6 / §11 / T-152 lite).
 * 추천 동문(최근 업데이트) + 본인 관련 신호(내 프로필 조회수) + 행사 기록(갤러리) 진입점.
 */
export default async function HomePage() {
  const me = await requireMemberPage("/home");

  const admin = createAdminClient();

  // 본인 관련 신호: 내 프로필 조회수(profile_view, target=내 프로필).
  const { count: viewCount } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "profile_view")
    .eq("target_id", me.profile.id);

  // 우리 기수 신규(같은 졸업연도, 최근).
  let cohortNewCount = 0;
  if (me.profile.graduation_year) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_public", true)
      .eq("graduation_year", me.profile.graduation_year)
      .neq("id", me.profile.id);
    cohortNewCount = count ?? 0;
  }

  // 추천 동문(최근 업데이트 6명).
  const directory = await listDirectory(me, { limit: 6 });
  const recommended = directory.items.filter((p) => p.id !== me.profile.id).slice(0, 5);

  return (
    <div className="px-5 py-5">
      <header>
        <p className="text-sm text-muted-foreground">안녕하세요,</p>
        <h1 className="text-xl font-bold">{me.profile.name} 님</h1>
      </header>

      {/* 본인 관련 신호 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">내 프로필 조회</p>
          <p className="mt-1 text-2xl font-bold">{viewCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">우리 기수 동문</p>
          <p className="mt-1 text-2xl font-bold">{cohortNewCount}</p>
        </Card>
      </div>

      {/* 바로가기 허브 — 기회/콘텐츠/행사 기록(하단 탭이 아닌 섹션, IA 결정 §G) */}
      <div className="mt-3 space-y-2">
        <HubCard
          href="/jobs"
          icon={Briefcase}
          title="기회"
          desc="채용·공모·프로젝트 공고"
        />
        <HubCard
          href="/content"
          icon={FileText}
          title="콘텐츠"
          desc="동문 인터뷰·소식"
        />
        <HubCard
          href="/albums"
          icon={Images}
          title="행사 기록"
          desc="동문 행사 사진·영상 갤러리"
        />
      </div>

      {/* 추천 동문 */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            추천 동문
          </h2>
          <Link href="/alumni" className="text-xs text-muted-foreground">
            전체 보기
          </Link>
        </div>
        {recommended.length === 0 ? (
          <EmptyState
            title="아직 추천할 동문이 없어요"
            description="프로필을 채우면 더 많은 동문이 모여요"
          />
        ) : (
          <div className="space-y-3">
            {recommended.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HubCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Card>
    </Link>
  );
}

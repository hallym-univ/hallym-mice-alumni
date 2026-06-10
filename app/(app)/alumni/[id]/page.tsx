import Link from "next/link";
import { after } from "next/server";

import { ArrowLeft, BadgeCheck, CalendarClock } from "lucide-react";

import { Avatar } from "@/components/profile/Avatar";
import { ContactActions } from "@/components/profile/ContactActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { requireMemberPage } from "@/lib/guards/page";
import { getProfileDetail } from "@/lib/profile/queries";
import { recordEvent, makeCohortHash } from "@/lib/analytics/events";
import {
  COFFEECHAT_LABEL,
  COFFEECHAT_TONE,
  EMPLOYMENT_LABEL,
  ROLE_LABEL,
  formatDate,
} from "@/lib/labels";
import { ERROR } from "@/lib/messages";

/**
 * 프로필 상세 (§6.2·§6.3 / §11.4 / T-203·T-204).
 * 4상태: 정상 / 없음 / 비공개 / 차단. 오픈카톡은 정책 통과 시에만 노출.
 */
export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireMemberPage(`/alumni/${id}`);

  const result = await getProfileDetail(me, id);

  if (result.kind === "not_found") {
    return (
      <DetailShell>
        <EmptyState title={ERROR.notFound.title} description="없거나 비공개된 프로필이에요." action={{ label: "동문 목록", href: "/alumni" }} />
      </DetailShell>
    );
  }
  if (result.kind === "private") {
    return (
      <DetailShell>
        <EmptyState title={ERROR.privateProfile.title} description={ERROR.privateProfile.cta} action={{ label: "동문 목록", href: "/alumni" }} />
      </DetailShell>
    );
  }
  if (result.kind === "blocked") {
    return (
      <DetailShell>
        <EmptyState title="연결할 수 없어요" description="이 회원과는 서로 연결할 수 없어요." action={{ label: "동문 목록", href: "/alumni" }} />
      </DetailShell>
    );
  }

  const p = result.profile;

  // 조회수 신호(본인 조회는 제외) — after()로 응답 전송 후 기록(렌더를 막지 않음).
  if (!p.is_self) {
    after(() =>
      recordEvent({
        eventType: "profile_view",
        cohortHash: makeCohortHash(me.userId),
        profileId: me.profile.id,
        targetId: p.id,
      }).catch(() => {
        // 분석 이벤트 실패는 무시.
      }),
    );
  }

  const cohort = p.cohort ?? p.graduation_year;

  return (
    <div className="pb-8">
      <header className="flex items-center gap-2 px-5 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로">
          <Link href="/alumni">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">동문 프로필</span>
      </header>

      {/* 상단: 사진·이름·기수·인증 */}
      <section className="flex flex-col items-center px-5 pt-2 text-center">
        <Avatar src={p.photo_url} name={p.name} size={88} />
        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="text-xl font-bold">{p.name}</h1>
          {p.is_verified ? (
            <BadgeCheck className="h-5 w-5 text-primary" aria-label="인증 동문" />
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <Badge variant="outline">{ROLE_LABEL[p.role]}</Badge>
          {cohort ? <Badge variant="outline">{cohort}년</Badge> : null}
          {p.department ? <Badge variant="outline">{p.department}</Badge> : null}
          {p.coffeechat_status ? (
            <Badge variant={COFFEECHAT_TONE[p.coffeechat_status]}>
              {COFFEECHAT_LABEL[p.coffeechat_status]}
            </Badge>
          ) : null}
        </div>
        {(p.organization || p.position) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {[p.organization, p.position].filter(Boolean).join(" · ")}
            {p.employment_status ? ` · ${EMPLOYMENT_LABEL[p.employment_status]}` : ""}
          </p>
        )}
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="h-3 w-3" />
          {formatDate(p.updated_at)} 업데이트
        </p>
      </section>

      {/* 본문: 소개·경력·태그 */}
      <section className="mt-6 space-y-5 px-5">
        {p.bio ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">소개</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{p.bio}</p>
          </div>
        ) : null}
        {p.career_summary ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">경력</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{p.career_summary}</p>
          </div>
        ) : null}
        {p.tags.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">분야</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <Badge key={t.id} variant="secondary">
                  {t.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* 하단 고정: 연락 액션 */}
      <section className="mt-8 px-5">
        {p.is_self ? (
          <Button asChild variant="outline" className="w-full">
            <Link href="/me">내 프로필 수정</Link>
          </Button>
        ) : (
          <ContactActions profile={p} />
        )}
      </section>
    </div>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-8">
      <header className="flex items-center gap-2 px-5 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로">
          <Link href="/alumni">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">동문 프로필</span>
      </header>
      {children}
    </div>
  );
}

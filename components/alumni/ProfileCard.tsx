import Link from "next/link";

import { BadgeCheck } from "lucide-react";

import { Avatar } from "@/components/profile/Avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  COFFEECHAT_LABEL,
  COFFEECHAT_TONE,
  ROLE_LABEL,
} from "@/lib/labels";
import type { PublicProfileCard } from "@/lib/profile/visibility";

/**
 * 동문 디렉토리 카드 (§11.3 / §6.2 신뢰 시각화).
 * 표시: 이름·기수 배지·(선택)인증 배지·회사·직무·태그·커피챗 상태(신호).
 * 오픈카톡은 카드에 절대 노출하지 않는다(상세에서만).
 */
export function ProfileCard({ profile }: { profile: PublicProfileCard }) {
  const cohort = profile.cohort ?? profile.graduation_year;
  const orgLine = [profile.organization, profile.position]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/alumni/${profile.id}`} className="block">
      <Card className="flex gap-3 p-4 transition-colors hover:bg-accent/40">
        <Avatar src={profile.photo_url} name={profile.name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{profile.name}</span>
            {profile.is_verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-primary"
                aria-label="인증 동문"
              />
            ) : null}
            {cohort ? (
              <Badge variant="outline" className="shrink-0">
                {cohort}년
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0">
                {ROLE_LABEL[profile.role]}
              </Badge>
            )}
          </div>

          {orgLine ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {orgLine}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {ROLE_LABEL[profile.role]}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {profile.coffeechat_status ? (
              <Badge variant={COFFEECHAT_TONE[profile.coffeechat_status]}>
                {COFFEECHAT_LABEL[profile.coffeechat_status]}
              </Badge>
            ) : null}
            {profile.tags.slice(0, 3).map((t) => (
              <Badge key={t.id} variant="secondary">
                {t.name}
              </Badge>
            ))}
            {profile.tags.length > 3 ? (
              <span className="text-xs text-muted-foreground">
                +{profile.tags.length - 3}
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

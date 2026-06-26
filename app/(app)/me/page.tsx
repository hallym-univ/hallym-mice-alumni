import Link from "next/link";

import { ExternalLink, Shield } from "lucide-react";

import { AccountSettings } from "@/components/profile/AccountSettings";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { Avatar } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireMemberPage } from "@/lib/guards/page";
import { getPublicUrl } from "@/lib/storage";
import { getTagsMaster } from "@/lib/tags/queries";
import { loadMyProfile, loadMyTagIds } from "@/lib/profile/me";
import { toMyProfile } from "@/lib/profile/visibility";
import { ROLE_LABEL } from "@/lib/labels";
import type { TagRow } from "@/types/database";

/**
 * 내 정보 (§11.5 / T-201·T-108·T-151).
 * 프로필 수정(2단계·진행률·필드별 공개) + 계정 설정/탈퇴. 본인만.
 * 관리자는 여기서 관리자 화면으로 진입한다.
 */
export default async function MePage() {
  const me = await requireMemberPage("/me");

  const [profile, tagRows, tagIds] = await Promise.all([
    loadMyProfile(me.profile.id),
    getTagsMaster(),
    loadMyTagIds(me.profile.id),
  ]);
  if (!profile) throw new Error("프로필을 불러오지 못했어요.");

  const myProfile = toMyProfile(profile, tagIds);
  const photoUrl = profile.photo_path ? getPublicUrl(profile.photo_path) : null;

  return (
    <div className="px-5 py-5">
      {/* 요약 */}
      <header className="flex items-center gap-3">
        <Avatar src={photoUrl} name={profile.name} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABEL[profile.role]}
            {profile.department ? ` · ${profile.department}` : ""}
          </p>
        </div>
      </header>

      <div className="mt-3 flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/alumni/${me.profile.id}`}>
            <ExternalLink className="h-4 w-4" />
            공개 프로필 보기
          </Link>
        </Button>
        {me.isAdmin ? (
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href="/admin">
              <Shield className="h-4 w-4" />
              관리자
            </Link>
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">프로필</TabsTrigger>
          <TabsTrigger value="account">계정</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <ProfileEditor initial={myProfile} tags={(tagRows ?? []) as TagRow[]} />
        </TabsContent>
        <TabsContent value="account" className="mt-4">
          <AccountSettings isPublic={profile.is_public} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

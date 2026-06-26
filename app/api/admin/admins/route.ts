import { z } from "zod";

import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/types/database";

/**
 * 관리자 권한 관리 API.
 *
 * 실제 관리자 권한은 profiles.role 이 아니라 admins 테이블의 행 존재 여부로 결정한다.
 * 최초 1명은 ADMIN_EMAILS 부트스트랩으로 /admin 접근 후 본인을 관리자 등록하고,
 * 이후부터는 이 API를 통해 서비스 안에서 추가/해제한다.
 */

const adminAccessSchema = z.object({
  profileId: z.string().uuid("profileId 가 올바르지 않아요."),
});

export const POST = withAuth(
  async (req, { me }) => {
    const parsed = adminAccessSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "profileId 가 필요해요." },
        { status: 400 },
      );
    }

    const { profileId } = parsed.data;
    const admin = createAdminClient();
    const target = await getTargetProfile(admin, profileId);

    if (!target) {
      return Response.json({ error: "회원을 찾을 수 없어요." }, { status: 404 });
    }
    if (target.status !== "active") {
      return Response.json(
        { error: "활성 회원에게만 관리자 권한을 부여할 수 있어요." },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await admin
      .from("admins")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle<{ id: string }>();

    if (existingError) {
      return Response.json(
        { error: "관리자 권한 조회에 실패했어요." },
        { status: 500 },
      );
    }
    if (existing) {
      return Response.json({ ok: true, isAdmin: true });
    }

    const { error } = await admin.from("admins").insert({
      profile_id: profileId,
      granted_by: me.profile.id,
    });

    if (error) {
      return Response.json(
        { error: "관리자 권한 부여에 실패했어요." },
        { status: 500 },
      );
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "admin_grant",
      targetType: "profile",
      targetId: profileId,
      detail: { target_name: target.name },
    });

    return Response.json({ ok: true, isAdmin: true }, { status: 201 });
  },
  { role: "admin" },
);

export const DELETE = withAuth(
  async (req, { me }) => {
    const parsed = adminAccessSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "profileId 가 필요해요." },
        { status: 400 },
      );
    }

    const { profileId } = parsed.data;
    if (profileId === me.profile.id) {
      return Response.json(
        { error: "본인의 관리자 권한은 직접 해제할 수 없어요." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const [adminRows, targetAdmin, target] = await Promise.all([
      admin.from("admins").select("profile_id").limit(2),
      admin
        .from("admins")
        .select("id")
        .eq("profile_id", profileId)
        .maybeSingle<{ id: string }>(),
      getTargetProfile(admin, profileId),
    ]);

    if (adminRows.error || targetAdmin.error) {
      return Response.json(
        { error: "관리자 권한 조회에 실패했어요." },
        { status: 500 },
      );
    }
    if (!target) {
      return Response.json({ error: "회원을 찾을 수 없어요." }, { status: 404 });
    }
    if (!targetAdmin.data) {
      return Response.json({ ok: true, isAdmin: false });
    }
    if ((adminRows.data?.length ?? 0) <= 1) {
      return Response.json(
        { error: "마지막 관리자는 해제할 수 없어요." },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from("admins")
      .delete()
      .eq("profile_id", profileId);

    if (error) {
      return Response.json(
        { error: "관리자 권한 해제에 실패했어요." },
        { status: 500 },
      );
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "admin_revoke",
      targetType: "profile",
      targetId: profileId,
      detail: { target_name: target?.name ?? null },
    });

    return Response.json({ ok: true, isAdmin: false });
  },
  { role: "admin" },
);

async function getTargetProfile(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
) {
  const { data } = await admin
    .from("profiles")
    .select("id,name,status")
    .eq("id", profileId)
    .maybeSingle<Pick<ProfileRow, "id" | "name" | "status">>();

  return data ?? null;
}

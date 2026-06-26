import { createAdminClient } from "@/lib/supabase/admin";
import { recordAdminLog } from "@/lib/admin/log";
import { withAuth } from "@/lib/guards/withAuth";
import { toSafeIlikePattern } from "@/lib/search";
import { adminMemberPatchSchema, profileStatusSchema } from "@/lib/validators";
import type { ProfileRow } from "@/types/database";

/**
 * 회원 관리 API (T-301/302 / §6.7).
 *
 * GET   /api/admin/members?q=검색어&status=active  → 회원 검색.
 * PATCH /api/admin/members                          → 역할/상태/배지 변경.
 * 관리자 권한은 /api/admin/admins 에서 admins 테이블로 별도 관리한다.
 *
 * 주의(보안): role/status/is_verified 는 일반 "사용자 update" 경로에서는 화이트리스트로
 * 제거되지만, 이 경로는 관리자 전용(requireAdmin)이므로 의도적으로 변경을 허용한다.
 * is_verified 는 비차단 "배지"일 뿐 접근 제어에 쓰이지 않는다(v2.4).
 * 모든 변경은 admin_logs 에 기록한다.
 */

export const GET = withAuth(
  async (req, { me }) => {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const statusParam = url.searchParams.get("status");

    const admin = createAdminClient();
    let query = admin
      .from("profiles")
      .select(
        "id, user_id, name, role, status, is_verified, organization, position, created_at, admins!admins_profile_id_fkey(id)",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (q) {
      // 이름/소속/직함 부분 검색(pg_trgm 인덱스 활용). .or() 필터 인젝션 방지.
      const pattern = toSafeIlikePattern(q);
      if (pattern) {
        query = query.or(
          `name.ilike.${pattern},organization.ilike.${pattern},position.ilike.${pattern}`,
        );
      }
    }

    if (statusParam && statusParam !== "all") {
      const parsed = profileStatusSchema.safeParse(statusParam);
      if (!parsed.success) {
        return Response.json({ error: "잘못된 상태 필터예요." }, { status: 400 });
      }
      query = query.eq("status", parsed.data);
    }

    const { data, error } = await query;
    if (error) {
      return Response.json({ error: "회원 목록 조회에 실패했어요." }, { status: 500 });
    }

    const members = ((data ?? []) as Array<
      Pick<
        ProfileRow,
        | "id"
        | "user_id"
        | "name"
        | "role"
        | "status"
        | "is_verified"
        | "organization"
        | "position"
        | "created_at"
      > & { admins: { id: string } | Array<{ id: string }> | null }
    >).map(({ admins, ...member }) => ({
      ...member,
      is_admin: Array.isArray(admins) ? admins.length > 0 : admins != null,
      is_self: member.id === me.profile.id,
    }));

    return Response.json({ members });
  },
  { role: "admin" },
);

export const PATCH = withAuth(
  async (req, { me }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청 본문이에요." }, { status: 400 });
    }

    const parsed = adminMemberPatchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }
    const { profileId, role, status, isVerified } = parsed.data;

    const update: Partial<Pick<ProfileRow, "role" | "status" | "is_verified">> = {};
    const detail: Record<string, unknown> = {};

    if (role !== undefined) {
      if (role === "admin") {
        return Response.json(
          { error: "관리자 권한은 별도의 관리자 권한 토글로 변경해주세요." },
          { status: 400 },
        );
      }
      update.role = role;
      detail.role = role;
    }

    if (status !== undefined) {
      update.status = status;
      detail.status = status;
    }

    if (isVerified !== undefined) {
      update.is_verified = isVerified;
      detail.is_verified = isVerified;
    }

    // 자기 자신을 정지/강등하는 실수 방지(최소한의 가드).
    if (me.profile.id === profileId && update.status && update.status !== "active") {
      return Response.json(
        { error: "본인 계정의 상태는 변경할 수 없어요." },
        { status: 400 },
      );
    }
    if (me.profile.id === profileId && update.role !== undefined) {
      return Response.json(
        { error: "본인 계정의 역할은 변경할 수 없어요." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", profileId)
      .select("id, name, role, status, is_verified")
      .maybeSingle();

    if (error || !data) {
      return Response.json({ error: "회원 정보 변경에 실패했어요." }, { status: 500 });
    }

    await recordAdminLog({
      adminProfileId: me.profile.id,
      action: "member_update",
      targetType: "profile",
      targetId: profileId,
      detail,
    });

    return Response.json({ member: data });
  },
  { role: "admin" },
);

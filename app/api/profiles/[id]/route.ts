import { withAuth } from "@/lib/guards/withAuth";
import { getProfileDetail } from "@/lib/profile/queries";

/**
 * GET /api/profiles/[id] — 프로필 상세 (§6.2 / T-203).
 *
 * 회원(active)만. 오픈카톡은 등록자 공개 설정 + 비파트너 뷰어일 때만 응답에 포함.
 * 비공개/차단/없음은 상태로 구분해 클라가 적절한 빈 상태를 보여준다.
 */
export const GET = withAuth<{ id: string }>(
  async (_req, { me, params }) => {
    const id = (await params)?.id;
    if (!id) {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    try {
      const result = await getProfileDetail(me, id);
      switch (result.kind) {
        case "ok":
          return Response.json({ profile: result.profile });
        case "not_found":
          return Response.json({ error: "찾을 수 없어요.", reason: "not_found" }, { status: 404 });
        case "private":
          return Response.json({ error: "비공개 프로필이에요.", reason: "private" }, { status: 403 });
        case "blocked":
          return Response.json({ error: "연결할 수 없어요.", reason: "blocked" }, { status: 403 });
        default:
          return Response.json({ error: "불러오지 못했어요." }, { status: 500 });
      }
    } catch (e) {
      console.error("[GET /api/profiles/[id]]", e);
      return Response.json({ error: "불러오지 못했어요." }, { status: 500 });
    }
  },
  { role: "member" },
);

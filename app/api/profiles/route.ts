import { withAuth } from "@/lib/guards/withAuth";
import { listDirectory } from "@/lib/profile/queries";
import { profileListQuerySchema } from "@/lib/validators";

/**
 * GET /api/profiles — 동문 디렉토리 목록/검색 (§6.2 / T-202).
 *
 * 회원(active)만. 오픈카톡 URL 은 카드 응답에 절대 포함하지 않는다(visibility 모듈이 강제).
 * 쿼리: q, organization, position, tag, year, coffeechat=open, cursor, limit
 */
export const GET = withAuth(
  async (req, { me }) => {
    const url = new URL(req.url);
    const sp = url.searchParams;
    const parsed = profileListQuerySchema.safeParse(Object.fromEntries(sp));
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "검색 조건을 확인해주세요." },
        { status: 400 },
      );
    }
    const input = parsed.data;

    try {
      const result = await listDirectory(me, {
        q: input.q,
        organization: input.organization,
        position: input.position,
        tagId: input.tag,
        graduationYear: input.year,
        coffeechatOpen: input.coffeechat === "open",
        cursor: input.cursor,
        limit: input.limit,
      });

      return Response.json(result);
    } catch (e) {
      console.error("[GET /api/profiles]", e);
      return Response.json(
        { error: "목록을 불러오지 못했어요." },
        { status: 500 },
      );
    }
  },
  { role: "member" },
);

import { withAuth } from "@/lib/guards/withAuth";
import { listDirectory } from "@/lib/profile/queries";

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

    const yearRaw = sp.get("year");
    const cursorRaw = sp.get("cursor");
    const limitRaw = sp.get("limit");

    try {
      const result = await listDirectory(me, {
        q: sp.get("q")?.trim() || undefined,
        organization: sp.get("organization")?.trim() || undefined,
        position: sp.get("position")?.trim() || undefined,
        tagId: sp.get("tag")?.trim() || undefined,
        graduationYear:
          yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined,
        coffeechatOpen: sp.get("coffeechat") === "open",
        cursor: cursorRaw ? Number(cursorRaw) : undefined,
        limit: limitRaw ? Number(limitRaw) : undefined,
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

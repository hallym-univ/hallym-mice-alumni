import { withAuth } from "@/lib/guards/withAuth";
import {
  makeCohortHash,
  recordEvent,
  type EventType,
} from "@/lib/analytics/events";

/**
 * POST /api/events — 행동 이벤트 기록 (§6.8 / T-207).
 *
 * 클라이언트(프로필 상세 등)가 핵심 클릭을 기록할 때 호출한다.
 * 코호트 키는 서버에서 me.userId 로 해시(클라이언트가 임의 actorKey 를 못 넣게).
 * 사용자가 기록 가능한 이벤트만 화이트리스트로 한정한다.
 */

const ALLOWED: ReadonlySet<EventType> = new Set<EventType>([
  "profile_view",
  "coffeechat_click",
  "proposal_email_click",
]);

export const POST = withAuth(
  async (req, { me }) => {
    let body: { eventType?: string; targetId?: string | null };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
    }

    const eventType = body.eventType as EventType | undefined;
    if (!eventType || !ALLOWED.has(eventType)) {
      return Response.json({ error: "허용되지 않은 이벤트예요." }, { status: 422 });
    }

    try {
      await recordEvent({
        eventType,
        cohortHash: makeCohortHash(me.userId),
        profileId: me.profile.id,
        targetId: body.targetId ?? null,
      });
    } catch (e) {
      console.error("[POST /api/events]", e);
      return Response.json({ error: "기록에 실패했어요." }, { status: 500 });
    }

    return Response.json({ ok: true });
  },
  { role: "member" },
);

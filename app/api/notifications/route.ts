import { withAuth } from "@/lib/guards/withAuth";
import { listMyNotifications, unreadCount } from "@/lib/notifications/queries";

/** GET /api/notifications — 내 인앱 알림 목록 + 미읽음 수 (§6.8). 회원 전용. */
export const GET = withAuth(
  async (_req, { me }) => {
    try {
      const [items, unread] = await Promise.all([
        listMyNotifications(me),
        unreadCount(me),
      ]);
      return Response.json({ items, unread });
    } catch (e) {
      console.error("[GET /api/notifications]", e);
      return Response.json({ error: "알림을 불러오지 못했어요." }, { status: 500 });
    }
  },
  { role: "member" },
);

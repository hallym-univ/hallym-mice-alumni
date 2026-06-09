import { NotificationList } from "@/components/notifications/NotificationList";
import { requireMemberPage } from "@/lib/guards/page";

/** 알림 인박스 (§6.8). 로그인 회원만. */
export default async function NotificationsPage() {
  await requireMemberPage("/notifications");
  return (
    <section className="px-5 py-5">
      <h1 className="text-xl font-bold">알림</h1>
      <div className="mt-4">
        <NotificationList />
      </div>
    </section>
  );
}

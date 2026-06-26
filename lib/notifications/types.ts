import type { NotificationRow } from "@/types/database";

export type NotificationListItem = Pick<
  NotificationRow,
  "id" | "type" | "payload" | "read_at" | "created_at"
>;

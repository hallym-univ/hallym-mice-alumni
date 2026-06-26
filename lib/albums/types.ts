import type { AlbumImageRow, AlbumRow } from "@/types/database";

export type PublicAlbumListItem = Pick<
  AlbumRow,
  | "id"
  | "title"
  | "event_date"
  | "description"
  | "hashtags"
  | "cover_image_key"
  | "created_at"
>;

export type PublicAlbumDetail = Pick<
  AlbumRow,
  | "id"
  | "title"
  | "event_date"
  | "description"
  | "hashtags"
  | "cover_image_key"
  | "youtube_video_id"
  | "consent_confirmed"
  | "is_public"
  | "created_at"
  | "updated_at"
>;

export type PublicAlbumImage = Pick<
  AlbumImageRow,
  "id" | "image_key" | "caption" | "sort_order" | "created_at"
>;

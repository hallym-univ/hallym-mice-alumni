import type { ArticleStatus } from "@/types/database";

/**
 * 콘텐츠(인터뷰/소식) 조회 결과 모양 (client-safe: 서버 전용 import 없음).
 * cover_url 은 R2 공개 URL 로 조립된 값. body 는 plain text(리치에디터 없음).
 */

export interface RelatedProfileLite {
  id: string;
  name: string;
  photo_url: string | null;
}

export interface ArticleListItem {
  id: string;
  title: string;
  summary: string;
  cover_url: string | null;
  tags: string[];
  status: ArticleStatus;
  created_at: string;
}

export interface ArticleDetail extends ArticleListItem {
  body: string;
  related_profile: RelatedProfileLite | null;
  updated_at: string;
}

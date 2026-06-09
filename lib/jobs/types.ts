import type { JobStatus, JobType, TagRow } from "@/types/database";

/**
 * 구인구직 조회 결과 모양 (client-safe: 서버 전용 import 없음).
 * 컴포넌트와 쿼리 모듈이 공유한다. author 의 PII(이메일/오픈카톡)는 절대 담지 않는다.
 */

export interface JobAuthor {
  id: string;
  name: string;
}

export interface JobListItem {
  id: string;
  title: string;
  organization: string;
  job_type: JobType;
  location: string | null;
  deadline: string | null;
  compensation: string | null;
  status: JobStatus;
  created_at: string;
  tags: TagRow[];
  author: JobAuthor | null;
  is_bookmarked: boolean;
}

export interface JobDetail extends JobListItem {
  description: string;
  requirements: string | null;
  apply_url: string | null;
  contact: string | null;
  updated_at: string;
  is_author: boolean;
}

export interface JobListResult {
  items: JobListItem[];
  nextCursor: number | null;
  total: number | null;
}

import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 행동 이벤트 기록 헬퍼 (§6.8) — 서버에서만 호출한다.
 *
 * 모든 events 기록 시 actor_cohort_hash 를 반드시 채운다(DB가 not null 로 강제 — 부록 A).
 * 코호트 키는 salted hash 로, 탈퇴(profile_id=null) 후에도 비식별 코호트 리텐션을 유지한다.
 */

export type EventType =
  | "login"
  | "profile_view"
  | "coffeechat_click"
  | "proposal_email_click"
  | "report_submit"
  // Phase 2/3
  | "post_create"
  | "comment_create"
  | "job_create"
  | "profile_upload_url_request"
  | "asset_upload_url_request"
  | "remote_image_import"
  | "job_view"
  | "job_apply_click"
  | "job_bookmark"
  | "article_view"
  | "newsletter_click";

/** ADMIN/시크릿이 아닌 코호트용 salt. 노출돼도 식별 불가하도록 user id 와 결합해 해시한다. */
const COHORT_SALT = "hallym-mice-cohort-v1";

/** 사용자 식별자(보통 auth user id)로부터 비가역 코호트 키를 만든다. */
export function makeCohortHash(actorKey: string): string {
  return createHash("sha256").update(`${COHORT_SALT}:${actorKey}`).digest("hex");
}

export interface RecordEventInput {
  eventType: EventType;
  /** 코호트 해시 원본 키(예: auth user id). cohortHash 를 직접 주면 우선한다. */
  actorKey?: string;
  cohortHash?: string;
  profileId?: string | null;
  targetId?: string | null;
}

/**
 * events 테이블에 한 건 기록한다.
 * actorKey 또는 cohortHash 중 하나는 반드시 제공해야 한다(코호트 키 누락 방지).
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  const cohortHash =
    input.cohortHash ?? (input.actorKey ? makeCohortHash(input.actorKey) : null);

  if (!cohortHash) {
    throw new Error("[events] actor_cohort_hash 누락: actorKey 또는 cohortHash 가 필요합니다.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("events").insert({
    event_type: input.eventType,
    actor_cohort_hash: cohortHash,
    profile_id: input.profileId ?? null,
    target_id: input.targetId ?? null,
  });

  if (error) {
    throw new Error(`[events] 기록 실패: ${error.message}`);
  }
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 단순 일일 rate limit (§6.3 제안 1일 5건 / §6.7 신고 1일 10건·동일대상 1일 1건).
 *
 * 별도 카운터 테이블을 만들지 않고 기존 events 를 단일 진실 소스로 삼아
 * "오늘(UTC 자정 기준) 같은 actor_cohort_hash + event_type" 개수를 센다.
 * 정밀 분산 카운팅이 필요해지면 전용 테이블로 승격할 수 있으나, v1 규모에선 충분하다.
 */

export class RateLimitUnavailableError extends Error {
  constructor(message = "요청 제한 확인에 실패했습니다.") {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}

function startOfTodayUtcISO(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  return start.toISOString();
}

/**
 * 오늘 동일 cohortHash + eventType 이벤트 수를 센다.
 * targetId 를 주면 동일 대상 한정으로 센다(동일대상 1일 1건 제한 등).
 */
export async function countTodayEvents(params: {
  cohortHash: string;
  eventType: string;
  targetId?: string | null;
}): Promise<number> {
  const admin = createAdminClient();
  let query = admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", params.eventType)
    .eq("actor_cohort_hash", params.cohortHash)
    .gte("created_at", startOfTodayUtcISO());

  if (params.targetId) {
    query = query.eq("target_id", params.targetId);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[rate-limit] count 실패:", error.message);
    throw new RateLimitUnavailableError();
  }
  return count ?? 0;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
}

/** limit 미만이면 ok=true. (이 함수는 카운트만, 실제 기록은 호출부가 recordEvent로 한다.) */
export async function checkDailyLimit(params: {
  cohortHash: string;
  eventType: string;
  limit: number;
  targetId?: string | null;
}): Promise<RateLimitResult> {
  const used = await countTodayEvents(params);
  return {
    ok: used < params.limit,
    remaining: Math.max(0, params.limit - used),
    limit: params.limit,
  };
}

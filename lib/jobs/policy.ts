import "server-only";

import type { JobStatus } from "@/types/database";

/**
 * 공고 공개 정책.
 *
 * 학생 제안 반영: 새 공고는 승인 대기 없이 바로 게시한다.
 * 단, 운영자가 숨김/마감 처리한 상태까지 작성자 수정으로 되살아나지는 않게 한다.
 */
export function getInitialJobStatus(): JobStatus {
  return "published";
}

export function getAuthorEditedJobStatus(currentStatus: JobStatus): JobStatus | null {
  if (currentStatus === "published" || currentStatus === "pending") {
    return "published";
  }
  return null;
}

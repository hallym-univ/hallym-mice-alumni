"use client";

import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * 로그인 화면 상태 안내 배너.
 *  - blocked=1   : 이용 제한(suspended/withdrawn) 계정.
 *  - withdrawn=1 : 탈퇴 완료.
 *  - error=auth  : OAuth 콜백 실패.
 */
export function LoginNotice() {
  const sp = useSearchParams();

  if (sp.get("withdrawn")) {
    return (
      <Alert className="mb-4" variant="success">
        <AlertDescription>
          탈퇴가 완료됐어요. 그동안 함께해주셔서 감사해요.
        </AlertDescription>
      </Alert>
    );
  }
  if (sp.get("blocked")) {
    return (
      <Alert className="mb-4" variant="destructive">
        <AlertDescription>
          이용이 제한된 계정이에요. 운영진에게 문의해주세요.
        </AlertDescription>
      </Alert>
    );
  }
  if (sp.get("error") === "auth") {
    return (
      <Alert className="mb-4" variant="destructive">
        <AlertDescription>
          로그인에 실패했어요. 다시 시도해주세요.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

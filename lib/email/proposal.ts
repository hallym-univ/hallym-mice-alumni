import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 제안 이메일 서버 중계 (§6.3-3 / T-206).
 *
 * 핵심: 발신자·실제 개인 이메일을 API 응답이나 수신 메일 어디에도 "그대로" 노출하지 않는다.
 *  - 수신자 실제 이메일은 서버(auth.users)에서만 조회해 To 로 사용하고, 절대 응답에 담지 않는다.
 *  - 회신은 플랫폼을 통하게 유도(개인 이메일 미회신). reply-to 도 설정하지 않는다.
 *  - 발송 결과는 notifications 에 기록(email_status: sent/failed/skipped). RESEND 키 없으면 skipped.
 */

export interface SendProposalParams {
  /** 수신 대상 프로필 id. */
  toProfileId: string;
  /** 수신자 auth user_id(이메일 조회용). */
  toUserId: string;
  /** 보내는 회원 이름(중계 본문에 표시. 실제 이메일은 미포함). */
  fromName: string;
  /** 제안 메시지 본문(사용자 입력). */
  message: string;
}

export type ProposalSendResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

const FROM_ADDRESS = "한림 MICE 동문 <no-reply@hallym-mice.example>";

export async function sendProposalEmail(
  params: SendProposalParams,
): Promise<ProposalSendResult> {
  const env = getServerEnv();
  const admin = createAdminClient();

  // 수신자 실제 이메일은 서버에서만 조회(응답에 절대 미포함).
  const {
    data: userData,
    error: userErr,
  } = await admin.auth.admin.getUserById(params.toUserId);

  const toEmail = userData?.user?.email ?? null;

  let result: ProposalSendResult;

  if (!env.resendApiKey) {
    // 개발/미설정 환경: 실제 발송은 건너뛰되 기록은 남긴다.
    result = { status: "skipped", reason: "RESEND_API_KEY 미설정" };
  } else if (userErr || !toEmail) {
    result = { status: "failed", reason: "수신자 이메일 조회 실패" };
  } else {
    try {
      const resend = new Resend(env.resendApiKey);
      const { error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: toEmail,
        subject: `[한림 MICE 동문] ${params.fromName} 님이 제안을 보냈어요`,
        text: buildBody(params.fromName, params.message),
      });
      result = error
        ? { status: "failed", reason: error.message }
        : { status: "sent" };
    } catch (e) {
      result = {
        status: "failed",
        reason: e instanceof Error ? e.message : "발송 오류",
      };
    }
  }

  // notifications 발송 로그(email 채널).
  await admin.from("notifications").insert({
    profile_id: params.toProfileId,
    type: "proposal_email",
    channel: "email",
    payload: { from_name: params.fromName },
    email_status:
      result.status === "sent"
        ? "sent"
        : result.status === "skipped"
          ? "skipped"
          : "failed",
  });

  return result;
}

function buildBody(fromName: string, message: string): string {
  return [
    `${fromName} 님이 한림 MICE 동문 플랫폼을 통해 제안을 보냈습니다.`,
    "",
    "─────────────────",
    message,
    "─────────────────",
    "",
    "이 메일은 플랫폼이 중계했습니다. 회신은 플랫폼 프로필을 통해 연락해주세요.",
    "(보낸 사람의 개인 이메일은 비공개입니다.)",
  ].join("\n");
}

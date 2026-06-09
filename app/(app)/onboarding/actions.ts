"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { recordEvent } from "@/lib/analytics/events";
import { onboardingSchema } from "@/lib/validators";

/**
 * 온보딩(가입 1단계) Server Action (§6.1c / T-101).
 *
 * 흐름:
 *  1) 세션 확인(로그인 필수). 이미 프로필이 있으면 /home 으로.
 *  2) onboardingSchema 검증(동의 3체크 포함 — 미체크 시 제출 불가).
 *  3) profiles insert(status='active' = 즉시 회원, 검증 게이트 없음).
 *  4) consents 3건 기록(terms/privacy/profile_public + doc_version).
 *  5) auth.updateUser({ data: { has_profile: true } }) → 미들웨어 라우팅 플래그.
 *  6) /home 으로 리다이렉트.
 *
 * 보안: role/status/is_verified 는 서버에서 고정한다(클라 입력 무시).
 */

const CONSENT_DOC_VERSION = "2025-01";

export type OnboardingState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  // 1) 세션
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요해요. 다시 로그인해주세요." };
  }

  const admin = createAdminClient();

  // 이미 프로필이 있으면 재가입 방지.
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    redirect("/home");
  }

  // 2) 검증
  const gradRaw = formData.get("graduation_year");
  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    department: formData.get("department"),
    graduation_year:
      gradRaw && String(gradRaw).trim() !== "" ? Number(gradRaw) : undefined,
    student_number: formData.get("student_number") ?? undefined,
    consent_terms: formData.get("consent_terms") === "on",
    consent_privacy: formData.get("consent_privacy") === "on",
    consent_profile_public: formData.get("consent_profile_public") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "입력값을 확인해주세요.", fieldErrors };
  }

  const input = parsed.data;

  // 3) profiles insert — role/status/is_verified 는 서버 고정.
  const { data: profile, error: insertErr } = await admin
    .from("profiles")
    .insert({
      user_id: user.id,
      name: input.name,
      role: input.role, // student/alumni/faculty 만 (스키마에서 강제)
      status: "active", // 즉시 회원
      department: input.department,
      graduation_year: input.graduation_year ?? null,
      student_number: input.student_number,
      coffeechat_status: "private", // 2단계에서 설정 전까지 기본 비공개
      is_public: true,
    })
    .select("id")
    .single();

  if (insertErr || !profile) {
    return {
      ok: false,
      error: "가입 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.",
    };
  }

  // 4) consents 기록(동의 입증).
  const { error: consentErr } = await admin.from("consents").insert([
    { profile_id: profile.id, doc_type: "terms", doc_version: CONSENT_DOC_VERSION },
    { profile_id: profile.id, doc_type: "privacy", doc_version: CONSENT_DOC_VERSION },
    {
      profile_id: profile.id,
      doc_type: "profile_public",
      doc_version: CONSENT_DOC_VERSION,
    },
  ]);
  if (consentErr) {
    // 동의 기록 실패는 PIPA 입증 불가 → 프로필 롤백.
    await admin.from("profiles").delete().eq("id", profile.id);
    return {
      ok: false,
      error: "동의 기록에 실패했어요. 다시 시도해주세요.",
    };
  }

  // 5) 미들웨어 라우팅 플래그.
  await supabase.auth.updateUser({ data: { has_profile: true } });

  // 가입 이벤트(코호트 리텐션).
  try {
    await recordEvent({ eventType: "login", actorKey: user.id, profileId: profile.id });
  } catch {
    // 이벤트 실패는 가입 자체를 막지 않는다.
  }

  // 6) 홈으로.
  redirect("/home");
}

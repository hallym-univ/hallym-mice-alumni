"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CONSENT } from "@/lib/messages";
import { USER_ROLE_OPTIONS } from "@/lib/labels";

import { submitOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = { ok: false };

/**
 * 가입 정보 입력 + 동의 폼 (§11.2 / T-101).
 * 동의 3체크 전부 켜야 제출 활성. 서버 검증이 최종 게이트(useActionState 로 에러 표시).
 */
export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    submitOnboarding,
    initialState,
  );
  const errs = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {/* 이름 */}
      <div className="space-y-1.5">
        <Label htmlFor="name">이름 *</Label>
        <Input id="name" name="name" required maxLength={40} placeholder="홍길동" />
        {errs.name ? <FieldError msg={errs.name} /> : null}
      </div>

      {/* 역할 */}
      <div className="space-y-1.5">
        <Label htmlFor="role">역할 *</Label>
        <Select name="role" required defaultValue="alumni">
          <SelectTrigger id="role">
            <SelectValue placeholder="역할 선택" />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errs.role ? <FieldError msg={errs.role} /> : null}
      </div>

      {/* 학과 */}
      <div className="space-y-1.5">
        <Label htmlFor="department">학과 / 전공 *</Label>
        <Input
          id="department"
          name="department"
          required
          maxLength={60}
          placeholder="컨벤션이벤트경영학과"
        />
        {errs.department ? <FieldError msg={errs.department} /> : null}
      </div>

      {/* 졸업연도 / 학번 (둘 중 하나) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="graduation_year">졸업연도</Label>
          <Input
            id="graduation_year"
            name="graduation_year"
            type="number"
            inputMode="numeric"
            placeholder="2020"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="student_number">학번</Label>
          <Input id="student_number" name="student_number" placeholder="20160000" />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        졸업연도 또는 학번 중 하나는 입력해주세요.
      </p>
      {errs.graduation_year ? <FieldError msg={errs.graduation_year} /> : null}

      {/* 동의 3체크 */}
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">필수 동의</legend>
        <ConsentRow name="consent_terms" label={CONSENT.terms} href="/terms" />
        <ConsentRow name="consent_privacy" label={CONSENT.privacy} href="/privacy" />
        <ConsentRow name="consent_profile_public" label={CONSENT.profilePublic} />
        <p className="text-xs text-muted-foreground">{CONSENT.ageNotice}</p>
      </fieldset>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "가입 중..." : "동의하고 가입하기"}
      </Button>
    </form>
  );
}

function ConsentRow({
  name,
  label,
  href,
}: {
  name: string;
  label: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={name} name={name} className="mt-0.5" required />
      <Label htmlFor={name} className="text-sm font-normal leading-relaxed">
        {label}
        {href ? (
          <>
            {" "}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-muted-foreground"
            >
              (보기)
            </a>
          </>
        ) : null}
      </Label>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-xs text-destructive">{msg}</p>;
}

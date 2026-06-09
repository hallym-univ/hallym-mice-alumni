import type {
  CoffeechatStatus,
  EmploymentStatus,
  ProfileRole,
} from "@/types/database";

/**
 * 표시용 라벨 매핑 (client-safe). 코드값 ↔ 한국어 라벨 단일 출처.
 * 컴포넌트에서 직접 import 가능(서버 시크릿 없음).
 */

export const COFFEECHAT_LABEL: Record<CoffeechatStatus, string> = {
  open: "커피챗 가능",
  monthly: "월 1회 가능",
  offer_only: "채용·업무 제안만",
  busy: "지금은 어려움",
  private: "비공개",
};

/** 커피챗 상태별 배지 톤(연락 가능성 시각화). */
export const COFFEECHAT_TONE: Record<
  CoffeechatStatus,
  "success" | "secondary" | "outline"
> = {
  open: "success",
  monthly: "success",
  offer_only: "secondary",
  busy: "outline",
  private: "outline",
};

export const ROLE_LABEL: Record<ProfileRole, string> = {
  student: "재학생",
  alumni: "동문",
  faculty: "교직원",
  partner: "외부 파트너",
  admin: "운영진",
};

export const EMPLOYMENT_LABEL: Record<EmploymentStatus, string> = {
  employed: "재직 중",
  student: "재학 중",
  seeking: "구직 중",
};

/** 커피챗 상태 선택 옵션(온보딩/프로필 편집). */
export const COFFEECHAT_OPTIONS: { value: CoffeechatStatus; label: string }[] = [
  { value: "open", label: COFFEECHAT_LABEL.open },
  { value: "monthly", label: COFFEECHAT_LABEL.monthly },
  { value: "offer_only", label: COFFEECHAT_LABEL.offer_only },
  { value: "busy", label: COFFEECHAT_LABEL.busy },
  { value: "private", label: COFFEECHAT_LABEL.private },
];

export const USER_ROLE_OPTIONS: { value: "student" | "alumni" | "faculty"; label: string }[] = [
  { value: "student", label: ROLE_LABEL.student },
  { value: "alumni", label: ROLE_LABEL.alumni },
  { value: "faculty", label: ROLE_LABEL.faculty },
];

export const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "employed", label: EMPLOYMENT_LABEL.employed },
  { value: "student", label: EMPLOYMENT_LABEL.student },
  { value: "seeking", label: EMPLOYMENT_LABEL.seeking },
];

/** 이름 → 이니셜 아바타 폴백 텍스트. */
export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // 한글은 첫 글자, 영문은 단어 첫 글자 최대 2자.
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2);
}

/** ISO 날짜 → "YYYY.MM.DD" 표기(프로필 신선도). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

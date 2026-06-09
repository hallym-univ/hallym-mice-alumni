import type { FieldVisibility, ProfileRow, TagRow } from "@/types/database";

/**
 * 프로필 직렬화/마스킹 (§8.2 공개 범위 / §6.2 / §13.3·13.4).
 *
 * 서버에서만 사용한다(데이터는 admin 클라이언트로 조회). 브라우저에 내려보내기 전
 * 반드시 이 모듈을 거쳐 민감필드(학번·타인 이메일·오픈카톡)를 정책에 맞게 제거·마스킹한다.
 *
 * 핵심 규칙:
 *  - 이름·역할·커피챗 상태·분야 태그는 항상 공개(field_visibility로 숨길 수 없음).
 *  - field_visibility[key] === false 인 필드는 본인이 아니면 노출하지 않는다(키 없음 = 공개).
 *  - 오픈카톡 URL: (a) 본인 공개 설정(field_visibility.open_kakao_url !== false) +
 *    (b) 값 존재 + (c) 뷰어가 파트너가 아님 → 일 때만 프로필 "상세"에 노출.
 *    디렉토리 카드/검색 응답에는 절대 포함하지 않는다.
 *  - 학번(student_number)·이메일은 본인/관리자에게만.
 */

/** field_visibility로 숨길 수 없는(항상 공개) 키. */
const ALWAYS_VISIBLE: ReadonlySet<keyof FieldVisibility> = new Set([
  // (FieldVisibility 키 중 토글 불가 항목은 아예 빼서 관리하지만, 방어적으로 기록)
]);

/** field_visibility 토글이 가능한 필드인지(키가 false면 비공개). */
export function isFieldHidden(
  visibility: FieldVisibility,
  key: keyof FieldVisibility,
): boolean {
  if (ALWAYS_VISIBLE.has(key)) return false;
  return visibility?.[key] === false;
}

/** 디렉토리 카드/검색 응답에 내려보내는 안전한 공개 프로필(오픈카톡·학번·이메일 없음). */
export interface PublicProfileCard {
  id: string;
  name: string;
  role: ProfileRow["role"];
  is_verified: boolean;
  cohort: number | null; // 기수(졸업연도 기준, 비공개면 null)
  graduation_year: number | null;
  admission_year: number | null;
  department: string | null;
  organization: string | null;
  position: string | null;
  employment_status: ProfileRow["employment_status"];
  coffeechat_status: ProfileRow["coffeechat_status"];
  photo_url: string | null;
  tags: { id: string; name: string; category: string | null }[];
  updated_at: string;
}

/** 프로필 상세(상세 화면 전용). 오픈카톡은 정책 통과 시에만 채워진다. */
export interface PublicProfileDetail extends PublicProfileCard {
  bio: string | null;
  career_summary: string | null;
  /** 정책(본인 공개 + 비파트너) 통과 시에만 값. 그 외 null. */
  open_kakao_url: string | null;
  /** 제안 이메일 서버 중계 폼 노출 가능 여부(차단/허용 반영). */
  proposal_email_allowed: boolean;
  is_self: boolean;
}

export interface SerializeContext {
  /** 뷰어가 이 프로필의 주인인지. */
  isSelf: boolean;
  /** 뷰어가 관리자인지. */
  isAdmin: boolean;
  /** 뷰어 역할(파트너면 오픈카톡 비열람). */
  viewerRole: ProfileRow["role"];
  /** R2 키 → 공개 URL 변환기(서버에서 lib/storage.getPublicUrl 주입). */
  toPhotoUrl: (key: string) => string;
}

/** 졸업연도 → 기수. 명부 규칙 미확정이라 졸업연도를 그대로 기수 후보로 노출한다. */
function resolveCohort(profile: ProfileRow, hidden: boolean): number | null {
  if (hidden) return null;
  return profile.graduation_year ?? null;
}

function field<T>(value: T, hidden: boolean, isSelf: boolean): T | null {
  if (isSelf) return value;
  return hidden ? null : value;
}

/** 디렉토리 카드용 직렬화(오픈카톡/학번/이메일/소개 제외). */
export function toProfileCard(
  profile: ProfileRow,
  tags: TagRow[],
  ctx: Pick<SerializeContext, "isSelf" | "toPhotoUrl">,
): PublicProfileCard {
  const v = profile.field_visibility ?? {};
  const photoHidden = isFieldHidden(v, "photo_path");
  const photoKey = field(profile.photo_path, photoHidden, ctx.isSelf);

  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    is_verified: profile.is_verified,
    cohort: resolveCohort(profile, isFieldHidden(v, "graduation_year") && !ctx.isSelf),
    graduation_year: field(profile.graduation_year, isFieldHidden(v, "graduation_year"), ctx.isSelf),
    admission_year: field(profile.admission_year, isFieldHidden(v, "admission_year"), ctx.isSelf),
    department: field(profile.department, isFieldHidden(v, "department"), ctx.isSelf),
    organization: field(profile.organization, isFieldHidden(v, "organization"), ctx.isSelf),
    position: field(profile.position, isFieldHidden(v, "position"), ctx.isSelf),
    employment_status: profile.employment_status,
    coffeechat_status: profile.coffeechat_status, // 항상 공개(신호)
    photo_url: photoKey ? ctx.toPhotoUrl(photoKey) : null,
    tags: tags.map((t) => ({ id: t.id, name: t.name, category: t.category })),
    updated_at: profile.updated_at,
  };
}

/**
 * 프로필 상세용 직렬화.
 * 오픈카톡은 (본인 공개 || 본인 || 관리자) && 비파트너(뷰어) 조건을 모두 통과할 때만 노출.
 */
export function toProfileDetail(
  profile: ProfileRow,
  tags: TagRow[],
  ctx: SerializeContext,
): PublicProfileDetail {
  const card = toProfileCard(profile, tags, ctx);
  const v = profile.field_visibility ?? {};

  // 오픈카톡 노출 정책
  const kakaoOwnerPublic = !isFieldHidden(v, "open_kakao_url");
  const viewerCanSeeKakao = ctx.viewerRole !== "partner" || ctx.isSelf || ctx.isAdmin;
  const showKakao =
    Boolean(profile.open_kakao_url) &&
    viewerCanSeeKakao &&
    (kakaoOwnerPublic || ctx.isSelf || ctx.isAdmin);

  return {
    ...card,
    bio: field(profile.bio, isFieldHidden(v, "bio"), ctx.isSelf),
    career_summary: field(profile.career_summary, isFieldHidden(v, "career_summary"), ctx.isSelf),
    open_kakao_url: showKakao ? profile.open_kakao_url : null,
    proposal_email_allowed: profile.proposal_email_allowed,
    is_self: ctx.isSelf,
  };
}

/**
 * 본인 프로필 편집 화면용(전 필드 + field_visibility). 마스킹 없음.
 * 본인/관리자에게만 반환할 것.
 */
export function toMyProfile(profile: ProfileRow, tagIds: string[]): MyProfile {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    status: profile.status,
    is_verified: profile.is_verified,
    student_number: profile.student_number,
    admission_year: profile.admission_year,
    graduation_year: profile.graduation_year,
    department: profile.department,
    organization: profile.organization,
    employment_status: profile.employment_status,
    position: profile.position,
    bio: profile.bio,
    career_summary: profile.career_summary,
    coffeechat_status: profile.coffeechat_status,
    open_kakao_url: profile.open_kakao_url,
    proposal_email_allowed: profile.proposal_email_allowed,
    photo_path: profile.photo_path,
    is_public: profile.is_public,
    field_visibility: profile.field_visibility ?? {},
    tag_ids: tagIds,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

export interface MyProfile {
  id: string;
  name: string;
  role: ProfileRow["role"];
  status: ProfileRow["status"];
  is_verified: boolean;
  student_number: string | null;
  admission_year: number | null;
  graduation_year: number | null;
  department: string | null;
  organization: string | null;
  employment_status: ProfileRow["employment_status"];
  position: string | null;
  bio: string | null;
  career_summary: string | null;
  coffeechat_status: ProfileRow["coffeechat_status"];
  open_kakao_url: string | null;
  proposal_email_allowed: boolean;
  photo_path: string | null;
  is_public: boolean;
  field_visibility: FieldVisibility;
  tag_ids: string[];
  created_at: string;
  updated_at: string;
}

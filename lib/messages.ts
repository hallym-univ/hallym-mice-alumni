/**
 * UX 라이팅 상수 (부록 D).
 * 원칙: 짧고, 다음 행동을 알려준다. 책임을 사용자에게 떠넘기지 않는다.
 * 화면에 노출되는 문구는 가급적 이 파일의 상수를 통해서만 쓴다(일관성·번역 용이).
 */

/** 빈 상태 3종 + 일반 무데이터. 각기 다른 문구 + CTA. */
export const EMPTY = {
  noData: { title: "아직 등록된 동문이 없어요", cta: "첫 프로필을 등록해보세요" },
  searchZero: { title: "검색 결과가 없어요", cta: "다른 키워드로 검색해보세요" },
  filterZero: { title: "조건에 맞는 동문이 없어요", cta: "필터를 초기화해보세요" },
  adminNoTasks: { title: "처리할 항목이 없어요", cta: "오늘은 깨끗합니다" },
  galleryNoAlbums: { title: "아직 행사 앨범이 없어요", cta: "곧 운영진이 채울 예정이에요" },
} as const;

/** 에러 상태. */
export const ERROR = {
  generic: { title: "문제가 발생했어요", cta: "다시 시도" },
  notFound: { title: "찾을 수 없어요", cta: "목록으로 돌아가기" },
  forbidden: { title: "접근 권한이 없어요", cta: "홈으로 이동" },
  privateProfile: { title: "비공개 프로필이에요", cta: "다른 동문을 찾아보세요" },
} as const;

/** 연락(커피챗/제안) 관련 카피. */
export const CONTACT = {
  // 오픈카톡은 본인 공개 설정 시 직접 표시. 없거나 비공개면 제안 이메일(서버 중계)로 폴백.
  openKakao: { title: "오픈카톡으로 바로 연결", cta: "오픈채팅 링크로 대화를 시작해보세요" },
  proposalFallback: { title: "오픈카톡이 없어요", cta: "이메일 제안으로 연락해보세요(서버 중계)" },
  proposalSent: { title: "제안을 보냈어요", cta: "상대가 확인하면 연락이 올 거예요" },
  blocked: { title: "연락할 수 없어요", cta: "이 회원에게는 메시지를 보낼 수 없어요" },
} as const;

/** 인증/온보딩 카피. */
export const AUTH = {
  loginRequired: { title: "로그인이 필요해요", cta: "Google로 계속하기" },
  onboardingNeeded: { title: "가입 정보를 입력해주세요", cta: "잠깐이면 끝나요" },
  suspended: { title: "이용이 제한된 계정이에요", cta: "운영진에게 문의해주세요" },
} as const;

/** 동의(PIPA) 카피. */
export const CONSENT = {
  terms: "이용약관에 동의합니다.",
  privacy: "개인정보 수집·이용에 동의합니다.",
  profilePublic: "프로필을 다른 회원에게 공개하는 데 동의합니다.",
  ageNotice: "본 서비스는 만 14세 이상만 가입할 수 있습니다.",
  required: "필수 항목에 모두 동의해야 가입할 수 있어요.",
} as const;

/** 하단 탭 라벨(4탭: 홈/동문/기회/내 정보). */
export const TABS = {
  home: "홈",
  alumni: "동문",
  jobs: "기회",
  me: "내 정보",
} as const;

/**
 * 비탭 섹션 라벨 — 홈 허브 카드·헤더 메뉴에서 진입(하단 탭 아님).
 * 콘텐츠/행사기록은 열람 빈도가 낮아 탭을 차지하지 않는다(5탭 과밀 방지).
 */
export const SECTIONS = {
  content: "콘텐츠",
  gallery: "행사 기록",
} as const;

export type EmptyMessage = (typeof EMPTY)[keyof typeof EMPTY];
export type ErrorMessage = (typeof ERROR)[keyof typeof ERROR];

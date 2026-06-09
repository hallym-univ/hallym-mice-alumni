# 구현 태스크 (as-built + 잔여)

> SDD 3단계. [요구사항](01-requirements.md)을 [스펙](02-spec.md)대로 구현한 **작업 단위 기록**과 **출시 전 남은 일**.
> 빌드 단계별로 묶었다. 각 태스크는 라우트/파일에 매핑돼 "어디서부터 손대면 되는지" 바로 찾도록 했다.

## 완료 (빌드 단계별)

### T0. 기반 — 스키마 + 보안 척추
- `supabase/migrations/0001_init.sql`: 18테이블 일괄 설계(P2·P3·알림 **선설계**), 전 테이블 RLS ENABLE(정책 0 = deny-all), `text+CHECK` enum, 전 FK `on delete`, `gin_trgm` 검색 인덱스, soft delete 컬럼.
- 보안 3계층: `lib/supabase/admin.ts`(service_role 단일 경로, `server-only`) · `lib/guards/withAuth.ts`(role 게이트) · `eslint.config.mjs`(`no-restricted-imports`로 컴포넌트의 admin/storage import 차단).
- `middleware.ts`(Edge 세션·라우트 보호) · `lib/supabase/{server,client}.ts` · `lib/env.ts`(env 검증).

### T1. Phase 1 Core — 회원 핵심
- 가입/온보딩: `/login` · `/auth/callback` · `/onboarding` + `app/api/profiles/me`. 동의 3종 → `consents`.
- 디렉토리/검색: `/(app)/home`·`/alumni` + `/api/profiles` + `lib/profile/queries.ts`(부분일치·무한스크롤).
- 프로필/공개범위: `/me` + `/api/profiles/me`(PATCH) + `lib/profile/visibility.ts`(필드별 토글·마스킹).
- 연락: `/api/proposal`(Resend 서버 중계, 1일 5건) · 오픈카톡 직접 링크(`coffeechat_click` 기록).
- 안전: `/api/blocks`(양방향) · `/api/reports`(임계 3건 자동숨김) · `/api/events`(화이트리스트).
- 계정/탈퇴: 로그아웃(헤더 계정 메뉴) · 탈퇴 익명화(2단계, `deleted_at`/`anonymized_at`).
- 관리자: `/admin`(대시보드) · `/admin/members` · `/admin/reports` + `admin_logs`.

### T2. Phase 1.5 — 갤러리
- `/(app)/albums/[id]` + `/admin/albums*` + `/api/admin/albums*`: 앨범 CRUD, 드래그&드롭 다중 업로드(진행률), `consent_confirmed` 없으면 비공개, YouTube 임베드.
- 라이트박스: 좌우·키보드·스와이프(무의존 컴포넌트).

### T3. 디자인 시스템 + 다크 랜딩
- 토큰: `app/globals.css`(흑백+코발트 `#2D5BFF`) · `tailwind.config.ts`(에디토리얼 타이포·모션). 로컬 폰트 Pretendard+Instrument Serif(`app/fonts/*.woff2`).
- 모션: `lib/hooks/useReveal`(IntersectionObserver, `prefers-reduced-motion` 존중).
- 랜딩: `app/(public)/page.tsx` + `components/landing/*`(자체 다크 테마, 코드 기반 비주얼, 실데이터 카운트).
- 발견성 수정: 로그아웃을 헤더 계정 메뉴로 노출(이전엔 숨겨져 있었음).

### T4. Phase 2 — 구인구직
- `/(app)/jobs`(보드·검색·필터) · `/jobs/[id]` · `/jobs/new` · `/jobs/[id]/edit` · `/jobs/mine` · `/jobs/bookmarks`.
- `/api/jobs`(GET·POST) · `/api/jobs/[id]`(PATCH·DELETE) · `/api/jobs/[id]/bookmark` · `/api/admin/jobs`(승인 큐).
- 상태머신: 작성=`pending`(서버 강제) → 관리자 승인=`published` → 마감/숨김. 승인 시 작성자에게 인앱 알림.

### T5. Phase 3 — 콘텐츠 + 블로그 에디터
- `/(app)/content/[id]`(마크다운 렌더, 관련 동문 링크) + `/admin/content`·`/admin/content/new`·`/admin/content/[id]`.
- `/api/admin/content`(GET·POST) · `/api/admin/content/[id]`(GET·PATCH·DELETE).
- `components/admin/MarkdownEditor.tsx`: 툴바(굵게/기울임/제목/목록/인용/코드/링크/이미지첨부) + 쓰기·미리보기 토글 + react-markdown 렌더.
- `components/admin/ContentEditor.tsx`: 생성·수정 **동일 풀 에디터**(허접 모달 제거). 커버·관련동문·태그·게시상태.

### T6. 알림 + 이미지 최적화
- `/(app)/notifications` + 헤더 벨(미읽음 배지) + `/api/notifications`·`/api/notifications/read`.
- `lib/notifications/create.ts`(`createInAppNotification`): 제안 도착·공고 게시 등에서 인앱 알림 생성, 클릭 시 해당 화면 이동.
- `components/admin/useImageUpload.ts`: 클라이언트 압축(canvas→WebP, scope별 maxDim), R2 presigned PUT.

### T7. 전수 감사 기반 수정
8개 병렬 에이전트 감사 → 41건 발견, High 4건 + 주요 Med/Low 수정:
- 내 공고 화면 부재 → `/jobs/mine` 신설.
- 차단 해제 UI 부재 → `components/profile/BlockedMembers.tsx` + `/api/blocks` GET.
- 인앱 알림이 실제로 생성 안 됨 → `createInAppNotification` 연결.
- 알림 payload 스키마 불일치 → `{title,message,link}` 통일.
- 검색어 인젝션 방어 → `lib/search.ts`(`sanitizeSearchTerm`, PostgREST `.or()` 메타문자 제거).

### T8. 법무 초안 + 배포
- `app/(public)/terms`·`privacy`: PIPA 처리방침/약관 초안(`components/legal/Legal.tsx`, `【 】` 미작성 자리 노랑 강조).
- GitHub `hallym-univ/hallym-mice-alumni`(private) + Vercel `hallym-s-projects/hallym-mice-alumni` 배포, env 11개 등록.

---

## 잔여 (출시 전 — 코드 아님, 운영 작업)

> 상세 체크리스트는 [README 출시 전 체크리스트](../../README.md#출시-전-체크리스트).

| # | 태스크 | 비고 |
|---|---|---|
| R1 | **재배포로 로그인 확정** | `NEXT_PUBLIC_SITE_URL`=prod 도메인 + Supabase `uri_allow_list` 동기화 후 재배포(빌드타임 번들). |
| R2 | **더미데이터 삭제** | `seed%@hallym-mice.test` 24명·공고·콘텐츠·AI 커버. |
| R3 | **약관/처리방침 `【 】` 채우기 + 법무 검토** | 운영주체·시행일·보호책임자·연락처. |
| R4 | **개인정보 보호책임자 1명 지정** | 법적 필수. |
| R5 | **Google OAuth 동의화면 게시** | Testing→Published. |
| R6 | **Resend 발신 도메인 인증** | + `lib/email/proposal.ts` `FROM_ADDRESS` 교체. |
| R7 | (선택) GitHub 자동배포 연결 | hallym-univ에 Vercel GitHub App 설치. |
| R8 | (선택) Supabase pause 핑 | `/api/health` 5~10분 주기 cron. |

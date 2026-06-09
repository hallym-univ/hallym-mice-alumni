# 기술 스펙 (as-built)

> SDD 2단계. [요구사항](01-requirements.md)을 만족하는 **실제 구현 구조**. 결정 근거는 [DECISIONS](../DECISIONS.md).

## 1. 시스템 아키텍처 — 심층 방어

3겹 보안. 하나가 뚫려도 나머지가 막는다.

| 계층 | 위치 | 역할 |
|---|---|---|
| 1차 — DB | `supabase/migrations/0001_init.sql` | 전 18테이블 **RLS ENABLE + 정책 0개 = deny-all**. anon 키 직접 조회 시 0행. |
| 2차 — 단일 경로 | `lib/supabase/admin.ts` (`server-only`) | **service_role 키 유일 사용처**. RLS 우회는 여기서만. ESLint가 `components/**`·`lib/supabase/client.ts`의 import 차단(`eslint.config.mjs`). |
| 3차 — 권한 게이트 | `lib/guards/withAuth.ts` | 모든 Route Handler/Server Action을 감싸 role(any/member/admin) 강제. 감싸지 않으면 admin 클라이언트에 닿지 못한다. |

- **세션/라우팅**: `middleware.ts` — Edge 런타임(anon 키만, admin 미사용). 비로그인→`/login`, 프로필 없음→`/onboarding`. 정밀 권한은 핸들러의 `withAuth`가 2차로.
- **Server Component 가드**: `lib/guards/page.ts`(`requireMemberPage`)가 `AuthError`를 상황별 리다이렉트로 변환.
- **AuthContext**: `{ userId, email, profile(ProfileRow), isAdmin }` — 핸들러는 이것만 받는다.

## 2. 데이터 모델 (`0001_init.sql`, 18테이블)

| 그룹 | 테이블 | 핵심 |
|---|---|---|
| 회원 | **profiles** | user_id(FK auth.users, on delete cascade), role/status, is_verified(비차단 배지), 프로필 필드, `field_visibility`(jsonb), `open_kakao_url`, `proposal_email_allowed`, `photo_path`(R2 key), `deleted_at`/`anonymized_at`(soft) |
| PIPA | **consents** | 동의 doc_type(terms/privacy/profile_public)·버전·일시 |
| 태그 | tags / profile_tags / job_tags | 분야 태그 마스터 + N:M |
| 안전 | blocks / reports / admins / admin_logs | 차단(양방향), 신고(상태머신), 관리자 명단·작업 로그 |
| 분석 | events / event_daily | `actor_cohort_hash`(salted, **not null 강제** — 탈퇴 후에도 비식별 코호트 리텐션), 90일 후 롤업 |
| 알림 | **notifications** | profile_id, type, channel(in_app/email), payload(jsonb), read_at, email_status |
| 갤러리 | albums / album_images | 운영자 큐레이션, cover/이미지 R2 key, `consent_confirmed`(게시동의), youtube_video_id |
| 구인 | **jobs** / job_bookmarks | author_id, job_type, status, deadline, apply_url(https) |
| 콘텐츠 | **articles** | author_id, summary/body(markdown), cover_path, related_profile_id, tags(text[]), status |

설계 규칙: enum은 `text + CHECK`(마이그레이션 유연), 모든 FK에 `on delete` 명시, 검색 컬럼에 `gin_trgm` 인덱스, soft delete. P2·P3·notifications 테이블은 **0001에 선설계**돼 추가 마이그레이션 0건으로 구현됨.

## 3. API 표면 (`app/api/**`)

| 도메인 | 라우트 | role |
|---|---|---|
| 프로필 | `/api/profiles`(GET 목록) · `/api/profiles/[id]` · `/api/profiles/me`(GET·PATCH) | member |
| 연락 | `/api/proposal`(POST 중계) · `/api/blocks`(GET·POST·DELETE) · `/api/reports`(POST) · `/api/events`(POST 화이트리스트) | member |
| 구인 | `/api/jobs`(GET·POST) · `/api/jobs/[id]`(PATCH·DELETE) · `/api/jobs/[id]/bookmark` · `/api/admin/jobs`(GET 큐·PATCH 승인) | member/admin |
| 콘텐츠 | `/api/admin/content`(GET·POST) · `/api/admin/content/[id]`(GET·PATCH·DELETE) | admin |
| 갤러리 | `/api/admin/albums*` · `/api/uploads`(presigned; profile scope=member, 운영자산=admin) | admin/member |
| 알림 | `/api/notifications`(GET) · `/api/notifications/read`(POST) | member |
| 관리 | `/api/admin/members`(GET·PATCH) · `/api/admin/reports`(GET·PATCH) | admin |
| 인프라 | `/auth/callback`(OAuth) · `/api/health`(무인증 핑) | — |

쿼리 모듈(서버 전용, `import "server-only"`): `lib/profile/queries.ts`·`lib/jobs/queries.ts`·`lib/content/public.ts`·`lib/albums/public.ts`·`lib/notifications/queries.ts`. 검색어는 `lib/search.ts`의 `sanitizeSearchTerm`으로 정제(PostgREST `.or()` 인젝션 차단).

## 4. 상태 머신

```
jobs:     draft → pending → published → closed
                                ↘ hidden        (작성=pending, 관리자 승인=published, 작성자 수정 시 재pending)
articles: draft → published → hidden
reports:  open → reviewing → resolved | dismissed   (자동 숨김 임계 3건)
coffeechat_status: open | monthly | offer_only | busy | private  (연락 가능성 신호)
profile.status: active | suspended | withdrawn
```

## 5. 인증 플로우

```
"시작하기" → /login → supabase.auth.signInWithOAuth(google, redirectTo=${SITE_URL}/auth/callback?next=…)
  → Google → Supabase 콜백(supabase.co/auth/v1/callback) → SITE_URL/auth/callback?code=…
  → exchangeCodeForSession → has_profile? 홈 : /onboarding
```
- `redirectTo`는 `NEXT_PUBLIC_SITE_URL` 기준(빌드 타임 번들). 도메인 변경 시 env+재배포 + Supabase `uri_allow_list` 동기화 필수.
- 미들웨어는 `user_metadata.has_profile` 플래그로 온보딩 분기(Edge에서 가볍게).

## 6. 스토리지 (R2)

- 업로드: 클라이언트 `useImageUpload`(`components/admin/useImageUpload.ts`)가 **canvas로 리사이즈+WebP 압축**(scope별 maxDim: profile 512/content·cover 1600/album 1920) → `/api/uploads`에서 presigned PUT URL 발급(서버가 key 생성) → 브라우저가 R2에 직접 PUT(서버 대역폭 0).
- 읽기: DB엔 객체 key만 저장, 표시 직전 `lib/storage.getPublicUrl`(서버) / `lib/utils.r2PublicUrl`(클라)로 공개 URL 조립. next/image 호스트 화이트리스트는 `next.config.mjs`.

## 7. 공개/마스킹 (`lib/profile/visibility.ts`)

- 디렉토리 카드: 오픈카톡·학번·이메일·소개 **제외**. `field_visibility[key]===false`면 타인에게 숨김(이름·역할·커피챗·태그는 항상 공개).
- 상세: 오픈카톡은 (본인 공개 || 본인 || 관리자) && 뷰어 비파트너 일 때만. 학번/이메일은 본인/관리자만.

## 8. 디자인 시스템

- 토큰: `app/globals.css`(흑백 + 코발트 `#2D5BFF`), `tailwind.config.ts`(에디토리얼 타이포 스케일·모션 키프레임). 폰트 = Pretendard(본문) + Instrument Serif(디스플레이), `app/fonts/*.woff2` 로컬.
- 모션: 무의존성 — `lib/hooks/useReveal`(IntersectionObserver) + CSS, `prefers-reduced-motion` 무력화.
- 랜딩: 자체 다크 테마(`app/(public)/page.tsx` + `components/landing/*`), 코드 기반 추상 비주얼.
- 마크다운: react-markdown + remark-gfm + @tailwindcss/typography(`prose`).

# 한림대 MICE 동문 플랫폼

단톡방·교수 추천으로 알음알음 모인 동문을 찾고, 커피챗·제안으로 연결되는 **실명 기반 동문 커뮤니티**. (개방형 회원제 — 가입 = 회원, 안전은 사후 모더레이션)

- **라이브**: https://hallym-mice-alumni-chi.vercel.app *(아직 비공개 테스트 단계 — [출시 전 체크리스트](#출시-전-체크리스트) 참고)*
- 스택: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn 스타일 UI + `@supabase/ssr` + Supabase(DB/Auth) + Cloudflare R2(이미지) + Resend(메일) + Vercel(호스팅)

> **이 레포의 북극성: 인수인계 단순성.** 매 학기 운영진이 비개발 학생팀으로 교체된다. "다음 사람이 이어받을 수 있는가"가 모든 설계·기술 선택의 최종 판정 기준이다.

### 문서 안내
| 문서 | 내용 |
|---|---|
| 이 README | 한눈에 보는 구조·실행·배포·인수인계 |
| [`docs/spec/01-requirements.md`](docs/spec/01-requirements.md) | SDD 유저스토리 요구사항(as-built) |
| [`docs/spec/02-spec.md`](docs/spec/02-spec.md) | 기술 스펙(아키텍처·데이터모델·API·상태머신) |
| [`docs/spec/03-tasks.md`](docs/spec/03-tasks.md) | 구현 태스크 + 잔여 작업 |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | **왜 이렇게 만들었나 — 핵심 결정 ADR** |
| [`docs/FORK_ENV.md`](docs/FORK_ENV.md) | 포크 팀원에게 전달할 환경변수 목록·템플릿 |
| [`docs/hallym-mice-alumni-platform-prd.md`](docs/hallym-mice-alumni-platform-prd.md) | 원본 기획서(v2.4 정본) |

---

## 아키텍처 (심층 방어)

```
브라우저
  │  (쿠키 세션)
  ▼
middleware.ts ─ 세션 리프레시 + 라우트 보호(비로그인→/login, 프로필없음→/onboarding)
  │            ※ Edge 런타임: anon 키만, service_role 미사용
  ▼
Route Handler / Server Component
  │  withAuth({role: any|member|admin})  ← 2차 권한 게이트(감싸지 않으면 데이터 못 만짐)
  ▼
lib/supabase/admin.ts  (service_role 단일 병목, server-only)
  │
  ├─▶ Supabase Postgres  ── 전 18테이블 RLS ENABLE · 정책 0개 = deny-all (안전망)
  ├─▶ Cloudflare R2       ── 이미지(lib/storage 단일 경로, presigned PUT)
  └─▶ Resend             ── 제안 이메일 서버 중계(실 이메일 비노출)
```

**핵심**: RLS가 1차로 모든 anon 접근을 차단(deny-all), 모든 데이터 접근은 `service_role` 단일 경로(`lib/supabase/admin.ts`)를 지나며, 각 핸들러의 `withAuth`가 2차로 권한을 강제한다. 세 겹 중 하나가 뚫려도 나머지가 막는다.

## 기능 맵

| 단계 | 기능 | 상태 |
|---|---|---|
| Phase 1 Core | 구글 가입·온보딩, 동문 디렉토리·검색, 프로필·필드별 공개, 연락(오픈카톡·이메일 제안), 신고·차단, 탈퇴/파기, 관리자(회원·신고) | ✅ |
| Phase 1.5 | 갤러리(운영자 큐레이션, R2, 게시동의) | ✅ |
| Phase 2 | 구인구직(작성→승인→게시·마감, 검색·북마크, 내 공고) | ✅ |
| Phase 3 | 콘텐츠(마크다운 블로그 에디터, 커버·관련동문) | ✅ |
| 부가 | 알림 인박스·벨, 이미지 자동 압축(WebP), 다크 에디터리얼 랜딩 | ✅ |

---

## 보안 5계명 (필독)

1. **RLS를 절대 끄지 마라.** 전 테이블 ENABLE + 정책 없음(deny-all) = 안전망. 끄는 순간 anon 키만으로 실명·직장·학번이 샌다.
2. **service_role 키는 서버에만.** `lib/supabase/admin.ts` 한 곳에서만 쓰고, `NEXT_PUBLIC`에 절대 넣지 마라.
3. **모든 서버 핸들러는 `withAuth`로 감싼다.** 감싸지 않으면 데이터에 닿지 않게 되어 있다.
4. **사용자 수정에서 `role`/`status`/`is_admin`/`is_verified`는 받지 않는다.** (자기 권한 상승·배지 자가부여 차단)
5. **콘솔로 DB를 직접 만지지 마라.** 운영은 관리자 화면으로. 콘솔 접근은 프로젝트 공용 계정 1개 + MFA.

---

## 로컬 실행

```bash
npm install                  # Node 22 이상
cp .env.example .env.local   # 값 채우기 (아래 셋업 절차)
npm run dev                  # http://localhost:3000

# 품질 게이트
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint (components→admin/storage import 차단 포함)
npm run security:check       # withAuth/route id/server-only/env/외부링크 보안 회귀 체크
npm run security:audit       # 운영 의존성 취약점 감사(moderate 이상)
npm run security:audit:all   # dev 포함 전체 의존성 감사(수동 점검용)
npm run build                # 프로덕션 빌드
npm run test:e2e             # Playwright 공개/인증/보안 헤더 스모크
npm run check                # type/lint/security/audit/build/security/e2e 전체 실행
```

GitHub Actions(`.github/workflows/production-safety.yml`)도 PR/push마다 `npm run check`를 실행한다. CI에는 더미 env만 넣어 실제 운영 시크릿 없이 타입·보안 규칙·운영 의존성 audit·빌드·번들 시크릿 문자열·Playwright E2E 스모크를 통과해야 한다.

> 로그인 뒤 화면(홈/동문)을 보려면 Supabase·Google OAuth 연결이 필요하다. 빠른 미리보기는 더미 `.env.local`로 공개 페이지(랜딩/로그인)만 확인 가능.

---

## 셋업 절차 (처음 한 번)

> 모든 외부 서비스는 **프로젝트 공용 계정 1개**로 생성·소유한다(개인 계정 금지, MFA 필수).

1. **Supabase**: 프로젝트 생성 → SQL Editor 또는 Supabase CLI로 `supabase/migrations/*.sql`을 파일명 순서대로 전체 실행(테이블 + RLS ENABLE + 후속 기능 스키마) → `supabase/seed.sql`(태그) → Settings·API에서 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` 확보.
2. **Google OAuth**: Cloud Console에서 OAuth 동의화면 + 웹 클라이언트 → Supabase Auth·Providers·Google에 Client ID/Secret 입력 → Google "승인된 리디렉션 URI"에 `https://<supabase-ref>.supabase.co/auth/v1/callback` 등록.
3. **Cloudflare R2**: 버킷 생성 → API 토큰(Object R/W) → `R2_*` 4개 + 공개 `r2.dev` 도메인 `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`. (브라우저 직접 PUT용 **CORS**: 허용 origin = 배포 도메인 + localhost, 메서드 PUT/GET.)
4. **Resend**: API 키 `RESEND_API_KEY` + **발신 도메인 인증**(미인증 시 제안 메일 발송 실패 — `lib/email/proposal.ts`의 `FROM_ADDRESS` 교체 필요).
5. **관리자**: `ADMIN_EMAILS`에 최초 관리자 Google 이메일. 이후 추가는 `admins` 테이블로(코드 배포 없이).

환경변수 전체 목록은 [`.env.example`](.env.example) 참고(11개).

---

## 배포 (Vercel)

현재 배포 상태:
- **GitHub**: `hallym-univ/hallym-mice-alumni` (private)
- **Vercel**: `hallym-s-projects/hallym-mice-alumni` → **https://hallym-mice-alumni-chi.vercel.app**
- 환경변수 11개는 Vercel Production에 등록됨. `NEXT_PUBLIC_SITE_URL` = 프로덕션 도메인.
- **함수 리전 = 서울(icn1)** — `vercel.json`의 `regions`로 고정. Supabase가 서울(ap-northeast-2)이라
  함수가 기본값(미국 iad1)으로 돌면 **모든 DB 쿼리가 태평양을 왕복**해 페이지가 수 초씩 느려진다. 바꾸지 말 것.

### 재배포 / 업데이트
```bash
vercel link            # 최초 1회 (프로젝트 연결)
vercel --prod          # 프로덕션 배포
```
> `NEXT_PUBLIC_*`는 **빌드 타임에 번들로 굳는다.** 도메인/SITE_URL을 바꾸면 env 갱신 후 **반드시 재배포**해야 반영된다(OAuth 리다이렉트가 SITE_URL 기준).

### 도메인 바꿀 때 같이 갱신할 곳 (3종 동기화)
1. Vercel env `NEXT_PUBLIC_SITE_URL` → 새 도메인 → 재배포
2. Supabase Auth `site_url` + `uri_allow_list`에 `https://<새도메인>/**` 추가
3. (Google 리디렉션은 Supabase 콜백 고정이라 보통 불변)

### GitHub push 자동배포 연결 (선택)
현재는 CLI 수동 배포다. push 시 자동배포를 원하면 Vercel 대시보드에서 **hallym-univ에 Vercel GitHub App 설치** 후 프로젝트 Git 연결.

### Supabase pause 방지 (무료 티어 필수)
cron-job.org / UptimeRobot로 5~10분마다 `https://<도메인>/api/health` 호출(무인증 200). 7일 비활성 시 Supabase 자동 정지를 막는다.

### 이벤트 로그 롤업/파기
`events` 원본은 90일 보존 후 `event_daily`로 집계하고 삭제한다. 운영 cron 또는 관리자 PC의 안전한 셸에서 아래 명령을 주 1회 이상 실행한다.

```bash
npm run events:rollup
```

보존 기간을 임시 조정해야 하면 `EVENT_RETENTION_DAYS=120 npm run events:rollup` 또는 `npm run events:rollup -- --retention-days=120` 형식으로 실행한다. 이 명령은 `SUPABASE_SERVICE_ROLE_KEY`를 사용하므로 브라우저나 공개 CI에서 실행하지 않는다.
동시에 두 번 실행되면 DB 함수가 advisory lock으로 한쪽을 `skipped: true` 처리해 중복 집계를 막는다.

---

## 출시 전 체크리스트

실제 동문에게 열기 전 **반드시**:

- [ ] **더미데이터 삭제** — 시드된 테스트 동문 24명(이메일 `seed%@hallym-mice.test`)·공고·콘텐츠·AI 커버 제거
- [ ] **약관/개인정보 처리방침** — `app/(public)/terms`·`privacy`의 노란 `【 】` 자리(운영주체·시행일·**개인정보 보호책임자**·연락처) 채우기 + **법무 검토**
- [ ] **개인정보 보호책임자 1명 지정** (법적 필수)
- [ ] **Google OAuth 동의화면 게시** — Testing → Published(전체 동문 로그인 가능하게)
- [ ] **Resend 발신 도메인 인증** + `FROM_ADDRESS` 교체(제안 메일 실발송)
- [ ] (선택) 커스텀 도메인 연결, GitHub 자동배포 연결

---

## 프로젝트 구조 (요약)

```
app/
  (public)/  page(다크 랜딩) · login · terms · privacy        # 공개
  (app)/     home · alumni/[id] · me · onboarding
             jobs(/[id]·/new·/[id]/edit·/mine·/bookmarks)      # 기회(P2)
             content/[id] · albums/[id] · notifications        # 콘텐츠(P3)·갤러리(P1.5)·알림
  admin/     reports · members · jobs · content · albums       # requireAdmin
  api/       profiles · proposal · reports · blocks · jobs · admin/* · uploads · notifications · events · health
  auth/callback/route.ts
components/  ui/ · common/ · alumni/ · jobs/ · content/ · albums/ · admin/ · landing/ · profile/ · notifications/ · legal/
lib/
  supabase/(server·client·admin) · guards/(withAuth·page·requireMember·requireAdmin)
  storage/(R2) · jobs/ · content/ · notifications/ · profile/(queries·visibility)
  validators/ · analytics/events · search · messages · labels · env · utils · hooks/useReveal
supabase/migrations/*.sql · seed.sql      middleware.ts      docs/
```

---

## 출시 전 보안 스모크 (매 배포)

```bash
# anon 키로 직접 조회 시 0행 또는 401 (RLS deny-all 확인)
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" | head
# 클라이언트 번들 시크릿 마커 + 실제 시크릿 값 유입 확인
npm run security:check
npm run security:audit
```

---

## 학기 인수인계 (운영진 교체 시)

1. 모든 외부 시크릿 **재발급**(service_role · Google secret · Resend · R2 키) 후 Vercel env 갱신·재배포.
2. GitHub/Supabase/Vercel/Cloudflare 권한을 새 공용 계정으로 이전(개인 계정 금지, MFA 복구코드 인계).
3. 더미/테스트 데이터 정리, pause 핑 동작 확인, 백업 복구 리허설 1회.
4. [보안 5계명](#보안-5계명-필독)·[결정 ADR](docs/DECISIONS.md) 필독.

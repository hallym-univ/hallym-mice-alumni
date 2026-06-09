# 한림대 MICE 동문 플랫폼

단톡방·교수 추천으로 알음알음 모인 동문을 찾고, 커피챗·제안으로 연결되는 **실명 기반 동문 커뮤니티**. (개방형 회원제 — 가입 = 회원, 안전은 사후 모더레이션)

- 스택: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn 스타일 UI + `@supabase/ssr` + Supabase(DB/Auth) + Cloudflare R2(이미지) + Resend(메일)
- 상세 기획: [`docs/hallym-mice-alumni-platform-prd.md`](docs/hallym-mice-alumni-platform-prd.md) (v2.4)

---

## 보안 5계명 (필독 — 부록 F)

1. **RLS를 절대 끄지 마라.** 전 테이블 ENABLE + 정책 없음(deny-all) = 안전망. 끄는 순간 anon 키만으로 실명·직장·학번이 샌다.
2. **service_role 키는 서버에만.** `lib/supabase/admin.ts` 한 곳에서만 쓰고, `NEXT_PUBLIC`에 절대 넣지 마라.
3. **모든 서버 핸들러는 `withAuth`로 감싼다.** 감싸지 않으면 데이터에 닿지 않게 되어 있다.
4. **사용자 수정에서 `role`/`status`/`is_admin`/`is_verified`는 받지 않는다.** (자기 권한 상승·배지 자가부여 차단)
5. **콘솔로 DB를 직접 만지지 마라.** 운영은 관리자 화면으로. 콘솔 접근은 프로젝트 공용 계정 1개 + MFA.

---

## 로컬 실행

```bash
# 1) 의존성 설치 (Node 22 이상)
npm install

# 2) 환경변수 준비
cp .env.example .env.local   # 값 채우기 (아래 셋업 절차 참고)

# 3) 개발 서버
npm run dev                  # http://localhost:3000

# 품질 게이트
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint (admin import 차단 포함)
npm run build                # 프로덕션 빌드
```

---

## 셋업 절차 (처음 한 번)

> 모든 외부 서비스는 **프로젝트 공용 계정 1개**로 생성·소유한다(개인 계정 금지, MFA 필수 — 부록 E).

### 1. Supabase (DB / Auth)

1. Supabase 프로젝트 2개 생성: **Prod / Preview**(실명 DB 오염 방지 — §9.3). `service_role` 키는 **Prod 전용**.
2. SQL Editor에서 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) **전체를 그대로** 실행 → 전 테이블 생성 + 전 테이블 RLS ENABLE(정책 0개 = deny-all).
3. 이어서 [`supabase/seed.sql`](supabase/seed.sql) 실행 → 분야 태그 마스터 입력.
4. (선택) `supabase gen types typescript > types/database.ts`로 타입 재생성(스키마 변경 시 동기화 — §7.3). 현재는 수기 타입이 들어 있다.
5. Project Settings → API에서 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 확보.

### 2. Google OAuth

1. Google Cloud Console → OAuth 동의 화면 + OAuth 클라이언트(Web) 생성.
2. Supabase Dashboard → Authentication → Providers → Google 활성화(Client ID/Secret 입력).
3. **Authorized redirect URI**(Google) + **Redirect URLs**(Supabase Auth)에 다음을 등록:
   - `http://localhost:3000/auth/callback` (로컬)
   - `https://<배포도메인>/auth/callback` (Prod/Preview)
4. `NEXT_PUBLIC_SITE_URL`을 각 환경에 맞게 설정(콜백 베이스).

### 3. Cloudflare R2 (이미지 — Phase 1.5부터 본격 사용)

1. R2 버킷 생성 → `R2_BUCKET`.
2. R2 API 토큰 발급(Object Read & Write) → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`.
3. **버킷 CORS** 설정: 허용 origin = 배포 도메인, 메서드 PUT/GET(브라우저 직접 업로드용).
4. 공개 읽기용 `r2.dev` 또는 커스텀 도메인 → `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`.
5. R2 키는 **서버 전용**(`NEXT_PUBLIC` 금지), `lib/storage`에서만 사용.

### 4. Resend (트랜잭션 메일)

1. Resend 계정 + API 키 발급 → `RESEND_API_KEY`(서버 전용).
2. 발신 도메인 인증(선택). 무료 한도: 월 3,000통 / 일 100통.

### 5. 관리자 부트스트랩

- `ADMIN_EMAILS`에 최초 관리자 Google 이메일을 콤마로 등록. 이후 관리자 추가는 `admins` 테이블로(코드 배포 없이 — §6.7).

### 6. Vercel 배포

1. GitHub 레포 연결 → Vercel 프로젝트 생성(Hobby 무료).
2. 환경변수를 Production / Preview / Development로 분리 입력. **`SUPABASE_SERVICE_ROLE_KEY`는 Production 전용**, Preview/클라이언트에 두지 않는다(§9.3).
3. Vercel 전용 기능(KV/Postgres/Cron) 미사용 → 호스트 이식성 유지(§9.2).
4. **pause 방지 핑**: cron-job.org / UptimeRobot로 5~10분마다 `https://<도메인>/api/health` 호출(무인증 200).

---

## 프로젝트 구조 (요약)

```
app/
  (public)/  page(랜딩) · login · terms · privacy
  (app)/     home · alumni · me · onboarding   # 하단 3탭 + 온보딩
  admin/     layout(관리자 가드) · page         # requireAdmin
  auth/callback/route.ts                        # OAuth 콜백
  api/health/route.ts                           # pause 방지 핑(무인증)
components/  ui/(프리미티브) · common/(EmptyState/ErrorState/LoadingSkeleton/BottomNav)
lib/
  supabase/  server.ts · client.ts · admin.ts(server-only)
  guards/    withAuth.ts · requireMember.ts · requireAdmin.ts
  storage/   index.ts(R2 어댑터 — 시크릿 단일 사용처)
  analytics/ events.ts   messages.ts   validators/   env.ts   utils.ts
types/       database.ts
supabase/    migrations/0001_init.sql · seed.sql
middleware.ts
```

자세한 데이터모델/권한/운영은 PRD §7(데이터 모델), §14(운영 체계), 부록 A~F 참고.

---

## 출시 전 보안 스모크 (매 배포 — 부록 F)

```bash
# anon 키로 직접 조회 시 0행 또는 401 (RLS deny-all 확인)
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" | head

# .next 빌드에 service_role 문자열 부재 확인
grep -r "service_role" .next/ && echo "FAIL" || echo "OK"

# ESLint가 components의 admin import 차단 확인
npm run lint
```

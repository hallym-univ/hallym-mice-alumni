# 포크 팀원용 환경변수 안내

이 문서는 이 레포를 포크한 팀원이 로컬 실행 또는 Vercel 배포를 할 때 필요한 환경변수 목록이다.

실제 비밀값은 이 파일에 적지 말고 비공개 채널로 따로 전달한다. `.env.local`, `.env`, `.env.production` 같은 실제 환경변수 파일은 절대 커밋하지 않는다.

현재 로컬 세팅과 동일한 실제 값 포함본은 `docs/FORK_ENV.private.md`에 생성해두었다. 이 파일은 `.gitignore`에 등록되어 있으며, 팀원에게 안전한 채널로만 전달한다.

## 빠른 시작

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 아래 값을 채운 뒤 `http://localhost:3000`에서 확인한다.

## `.env.local` 템플릿

```bash
# Supabase (DB / Auth)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Resend (transactional email)
RESEND_API_KEY=

# Admin bootstrap
ADMIN_EMAILS=

# Cloudflare R2 (image storage)
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=
```

## 변수별 설명

| 변수 | 공개 여부 | 필수 | 값 받는 곳 / 용도 |
|---|---:|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 | 필수 | Supabase Settings > API의 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 | 필수 | Supabase Settings > API의 anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | 필수 | Supabase Settings > API의 service_role key. 절대 브라우저/`NEXT_PUBLIC_`에 노출 금지 |
| `NEXT_PUBLIC_SITE_URL` | 공개 | 필수 | 로컬은 `http://localhost:3000`, 배포는 실제 서비스 도메인 |
| `RESEND_API_KEY` | 서버 전용 | 메일 발송 시 필수 | Resend API Key. 없으면 제안 메일 발송은 skip 처리됨 |
| `ADMIN_EMAILS` | 서버 전용 | 최초 관리자용 | `admins` 테이블이 비어 있을 때만 임시로 허용되는 최초 관리자 Google 이메일. 이후 권한 관리는 서비스 관리자 화면에서 처리 |
| `R2_ACCOUNT_ID` | 서버 전용 | 이미지 업로드 시 필수 | Cloudflare 계정 ID |
| `R2_BUCKET` | 서버 전용 | 이미지 업로드 시 필수 | Cloudflare R2 버킷명 |
| `R2_ACCESS_KEY_ID` | 서버 전용 | 이미지 업로드 시 필수 | R2 Object Read/Write API 토큰의 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | 서버 전용 | 이미지 업로드 시 필수 | R2 Object Read/Write API 토큰의 Secret Access Key |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | 공개 | 이미지 표시 시 필수 | R2 공개 읽기 URL 베이스. 예: `https://pub-xxxx.r2.dev` 또는 커스텀 도메인 |

## 전달할 때 주의할 것

- `NEXT_PUBLIC_`로 시작하는 값은 브라우저 번들에 포함될 수 있는 공개값이다.
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`는 시크릿이다. 문서, 이슈, PR, 커밋에 남기지 않는다.
- `ADMIN_EMAILS`는 영구 관리자 목록이 아니다. 최초 관리자가 로그인/온보딩 후 `/admin/members`에서 본인을 관리자 권한으로 등록하면, 이후 실제 권한은 `admins` 테이블 기준으로 관리된다.
- `NEXT_PUBLIC_SITE_URL`을 바꾸면 Next.js 빌드에 다시 반영해야 하므로 재배포가 필요하다.
- 배포 도메인을 바꿀 때는 Supabase Auth의 Site URL / Redirect URLs도 같이 맞춘다.
- Google OAuth Client ID/Secret은 이 앱의 env로 넣지 않는다. Supabase Auth > Providers > Google에 설정한다.

## Vercel 배포 시

Vercel Project Settings > Environment Variables에 위 11개 변수를 등록한다.

Preview 배포를 쓰는 경우 `NEXT_PUBLIC_SITE_URL`이 실제 Preview URL과 다르면 OAuth 콜백이 꼬일 수 있다. 운영 테스트는 Production 도메인 기준으로 맞추는 것을 권장한다.

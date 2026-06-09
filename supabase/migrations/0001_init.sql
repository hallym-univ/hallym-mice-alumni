-- 0001_init.sql : 한림대 MICE 동문 플랫폼 초기 스키마
create extension if not exists pg_trgm;

-- 1. profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('student','alumni','faculty','partner','admin')),
  status text not null default 'active' check (status in ('active','suspended','withdrawn')),
  is_verified boolean not null default false, -- (선택)동문 인증 배지. 접근 제어에 사용하지 않음(정보용, 명부 확보 시 자동 부여)
  student_number text,
  admission_year int,
  graduation_year int,
  department text,
  organization text,
  employment_status text check (employment_status in ('employed','student','seeking')),
  position text,
  bio text,
  career_summary text,
  coffeechat_status text check (coffeechat_status in ('open','monthly','offer_only','busy','private')),
  open_kakao_url text,
  proposal_email_allowed boolean not null default false,
  photo_path text,
  is_public boolean not null default true,
  field_visibility jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_name_trgm on profiles using gin (name gin_trgm_ops);
create index profiles_org_trgm on profiles using gin (organization gin_trgm_ops);
create index profiles_pos_trgm on profiles using gin (position gin_trgm_ops);
create index profiles_status_public on profiles (status, is_public);
create index profiles_grad_year on profiles (graduation_year);

-- 2. verification_roster (미래/선택 — v1 미사용. 명부 확보 시 적재하면 일치 가입자에게 is_verified 배지 자동 부여. 접근 제어 미사용)
create table verification_roster (
  id uuid primary key default gen_random_uuid(),
  student_number text not null,
  name text not null,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_number, name)
);

-- 3. consents
create table consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('terms','privacy','profile_public')),
  doc_version text not null,
  agreed_at timestamptz not null default now()
);
create index consents_profile_doc on consents (profile_id, doc_type);

-- 4. tags / profile_tags
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text
);
create table profile_tags (
  profile_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (profile_id, tag_id)
);

-- 5. blocks
create table blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_profile_id uuid not null references profiles(id) on delete cascade,
  blocked_profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_profile_id, blocked_profile_id)
);

-- 6. reports
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references profiles(id) on delete set null,
  target_type text not null check (target_type in ('profile','job','article')),
  target_id uuid not null,
  reason text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  handled_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 7. admins
create table admins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 8. admin_logs
create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- 9. events / event_daily
create table events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_cohort_hash text not null, -- 탈퇴자 포함 코호트 리텐션 유지용. DB가 누락을 강제 차단(심층 방어)
  profile_id uuid references profiles(id) on delete set null,
  target_id uuid,
  created_at timestamptz not null default now()
);
create index events_type_time on events (event_type, created_at);
create table event_daily (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  event_type text not null,
  count int not null default 0,
  unique (day, event_type)
);

-- 10. notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  channel text not null check (channel in ('in_app','email')),
  payload jsonb,
  read_at timestamptz,
  email_status text check (email_status in ('queued','sent','failed','skipped')),
  created_at timestamptz not null default now()
);

-- 11. albums / album_images (Phase 1.5 — 운영자 큐레이션 갤러리, 이미지는 R2)
create table albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  description text,
  cover_image_key text,           -- R2 객체 키(lib/storage 경유)
  youtube_video_id text,          -- videoId만 저장(잘못된 URL은 앱 레벨에서 거부)
  consent_confirmed boolean not null default false, -- 피사체 게시 동의 확인(미확인 시 공개 금지)
  is_public boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index albums_public_date on albums (is_public, event_date);
create table album_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  image_key text not null,        -- R2 객체 키(lib/storage 경유)
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index album_images_album_sort on album_images (album_id, sort_order);

-- 12. jobs (Phase 2)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete set null,
  title text not null,
  organization text not null,
  job_type text not null check (job_type in ('fulltime','intern','parttime','project','industry','contest','etc')),
  location text,
  deadline date,
  compensation text,
  description text not null,
  requirements text,
  apply_url text,
  contact text,
  status text not null default 'pending' check (status in ('draft','pending','published','closed','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_status_deadline on jobs (status, deadline);
create table job_tags (
  job_id uuid not null references jobs(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (job_id, tag_id)
);
create table job_bookmarks (
  profile_id uuid not null references profiles(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, job_id)
);

-- 13. articles (Phase 3)
create table articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete set null,
  title text not null,
  summary text not null,
  body text not null,
  cover_path text,
  related_profile_id uuid references profiles(id) on delete set null,
  tags text[],
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: 전 테이블 ENABLE (정책 없음 = deny-all 안전망)
alter table profiles enable row level security;
alter table verification_roster enable row level security;
alter table consents enable row level security;
alter table tags enable row level security;
alter table profile_tags enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table admins enable row level security;
alter table admin_logs enable row level security;
alter table events enable row level security;
alter table event_daily enable row level security;
alter table notifications enable row level security;
alter table albums enable row level security;
alter table album_images enable row level security;
alter table jobs enable row level security;
alter table job_tags enable row level security;
alter table job_bookmarks enable row level security;
alter table articles enable row level security;

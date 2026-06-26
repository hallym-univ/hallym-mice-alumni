-- 0002_connect.sql : 커넥트 피드 / 반응 / 댓글
-- 운영 방침: 공개 데모 저장소나 localStorage fallback 없이, active 회원만 앱 서버를 통해 접근한다.

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  post_type text not null default 'story' check (post_type in ('story','question','project','event','link')),
  external_url text,
  status text not null default 'published' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_status_time on posts (status, created_at desc);
create index posts_author_time on posts (author_id, created_at desc);

create table post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);
create index post_likes_profile on post_likes (profile_id, created_at desc);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_post_time on comments (post_id, created_at asc);
create index comments_author_time on comments (author_id, created_at desc);

alter table posts enable row level security;
alter table post_tags enable row level security;
alter table post_likes enable row level security;
alter table comments enable row level security;

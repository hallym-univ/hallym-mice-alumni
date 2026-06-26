-- 0003_album_hashtags.sql : 행사기록 해시태그 검색
-- 별도 행사 카테고리 필드 없이 운영자가 직접 붙이는 해시태그만 저장한다.

alter table albums
  add column hashtags text[] not null default '{}'::text[];

create index albums_hashtags_gin on albums using gin (hashtags);

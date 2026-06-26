-- 0007_operational_query_indexes.sql : 운영 조회/카운트 쿼리 인덱스 보강
-- 데이터가 쌓이는 v1 운영 경로(알림, 차단, 피드, 신고, 공개 목록)의 순차 스캔을 줄인다.

create index if not exists blocks_blocked_profile_lookup
  on blocks (blocked_profile_id, blocker_profile_id);

create index if not exists profile_tags_tag_profile_lookup
  on profile_tags (tag_id, profile_id);

create index if not exists job_tags_tag_job_lookup
  on job_tags (tag_id, job_id);

create index if not exists notifications_inbox_lookup
  on notifications (profile_id, channel, created_at desc);

create index if not exists notifications_unread_lookup
  on notifications (profile_id, channel, created_at desc)
  where read_at is null;

create index if not exists comments_published_post_time
  on comments (post_id, created_at asc)
  where status = 'published';

create index if not exists reports_status_time_lookup
  on reports (status, created_at desc);

create index if not exists reports_target_lookup
  on reports (target_type, target_id, created_at desc);

create index if not exists profiles_directory_updated_lookup
  on profiles (status, is_public, updated_at desc)
  where deleted_at is null;

create index if not exists jobs_published_created_lookup
  on jobs (status, created_at desc);

create index if not exists jobs_author_updated_lookup
  on jobs (author_id, updated_at desc);

create index if not exists job_bookmarks_profile_time_lookup
  on job_bookmarks (profile_id, created_at desc);

create index if not exists articles_status_created_lookup
  on articles (status, created_at desc);

create index if not exists albums_public_event_created_lookup
  on albums (is_public, event_date desc nulls last, created_at desc);

create index if not exists album_images_album_sort_created_lookup
  on album_images (album_id, sort_order asc, created_at asc);

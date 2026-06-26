-- 0006_events_rate_limit_index.sql : 제안/신고 일일 제한 조회 최적화

create index if not exists events_rate_limit_lookup
  on events (event_type, actor_cohort_hash, created_at desc);

create index if not exists events_rate_limit_target_lookup
  on events (event_type, actor_cohort_hash, target_id, created_at desc)
  where target_id is not null;

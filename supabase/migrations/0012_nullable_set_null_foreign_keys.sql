-- 0012_nullable_set_null_foreign_keys.sql : ON DELETE SET NULL FK 컬럼의 nullability 정합성 보정

alter table reports
  alter column reporter_profile_id drop not null;

alter table admin_logs
  alter column admin_profile_id drop not null;

alter table jobs
  alter column author_id drop not null;

alter table articles
  alter column author_id drop not null;

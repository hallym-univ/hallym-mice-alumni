-- 0004_report_connect_targets.sql : 커넥트 게시글/댓글 신고 대상 추가

alter table reports drop constraint if exists reports_target_type_check;
alter table reports
  add constraint reports_target_type_check
  check (target_type in ('profile','job','article','post','comment'));

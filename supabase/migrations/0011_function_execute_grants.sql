-- 0011_function_execute_grants.sql : 서버 전용 RPC 실행권 재고정
-- 공개 anon/authenticated 클라이언트는 함수 실행도 금지하고, 앱 서버 service_role 만 호출한다.

revoke all on function public.rollup_expired_events(integer) from public;
revoke all on function public.rollup_expired_events(integer) from anon;
revoke all on function public.rollup_expired_events(integer) from authenticated;
grant execute on function public.rollup_expired_events(integer) to service_role;

revoke all on function public.get_post_engagement_counts(uuid[]) from public;
revoke all on function public.get_post_engagement_counts(uuid[]) from anon;
revoke all on function public.get_post_engagement_counts(uuid[]) from authenticated;
grant execute on function public.get_post_engagement_counts(uuid[]) to service_role;

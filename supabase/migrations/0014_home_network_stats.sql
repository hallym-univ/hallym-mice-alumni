-- 0014_home_network_stats.sql : 홈 네트워크 현황 exact count 왕복을 단일 RPC 로 집계

create or replace function public.get_home_network_stats(since timestamptz)
returns table (
  alumni_count integer,
  coffeechat_count integer,
  recent_profile_count integer,
  job_count integer,
  post_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with public_profiles as (
    select id, coffeechat_status, updated_at
    from public.profiles
    where status = 'active'
      and is_public = true
      and deleted_at is null
  )
  select
    (select count(*)::integer from public_profiles) as alumni_count,
    (
      select count(*)::integer
      from public_profiles
      where coffeechat_status in ('open', 'monthly')
    ) as coffeechat_count,
    (
      select count(*)::integer
      from public_profiles
      where updated_at >= since
    ) as recent_profile_count,
    (
      select count(*)::integer
      from public.jobs
      where status = 'published'
    ) as job_count,
    (
      select count(*)::integer
      from public.posts
      where status = 'published'
    ) as post_count;
$$;

revoke all on function public.get_home_network_stats(timestamptz) from public;
revoke all on function public.get_home_network_stats(timestamptz) from anon;
revoke all on function public.get_home_network_stats(timestamptz) from authenticated;
grant execute on function public.get_home_network_stats(timestamptz) to service_role;

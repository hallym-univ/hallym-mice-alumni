-- 0010_post_engagement_counts.sql : 커넥트 피드 반응 수를 DB에서 게시글별로 집계
-- 목적: 피드 렌더 시 좋아요/댓글 행 전체를 앱 서버로 가져오지 않고 숫자만 전송한다.

create or replace function public.get_post_engagement_counts(post_ids uuid[])
returns table (
  post_id uuid,
  like_count integer,
  comment_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_posts as (
    select distinct unnest(post_ids) as post_id
  ),
  like_counts as (
    select
      pl.post_id,
      count(*)::integer as like_count
    from public.post_likes pl
    join requested_posts rp on rp.post_id = pl.post_id
    group by pl.post_id
  ),
  comment_counts as (
    select
      c.post_id,
      count(*)::integer as comment_count
    from public.comments c
    join requested_posts rp on rp.post_id = c.post_id
    where c.status = 'published'
    group by c.post_id
  )
  select
    rp.post_id,
    coalesce(l.like_count, 0)::integer as like_count,
    coalesce(c.comment_count, 0)::integer as comment_count
  from requested_posts rp
  left join like_counts l on l.post_id = rp.post_id
  left join comment_counts c on c.post_id = rp.post_id;
$$;

revoke all on function public.get_post_engagement_counts(uuid[]) from public;
revoke all on function public.get_post_engagement_counts(uuid[]) from anon;
revoke all on function public.get_post_engagement_counts(uuid[]) from authenticated;
grant execute on function public.get_post_engagement_counts(uuid[]) to service_role;

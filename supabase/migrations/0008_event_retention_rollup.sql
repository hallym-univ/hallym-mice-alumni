-- 0008_event_retention_rollup.sql : events 90-day retention rollup and purge

create or replace function public.rollup_expired_events(retention_days integer default 90)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff_at timestamptz;
  rolled_up_events bigint := 0;
  deleted_events bigint := 0;
begin
  if retention_days is null or retention_days < 1 or retention_days > 3650 then
    raise exception 'retention_days must be between 1 and 3650'
      using errcode = '22023';
  end if;

  cutoff_at := (((now() at time zone 'utc')::date - retention_days)::timestamp at time zone 'utc');

  with expired as (
    select
      (created_at at time zone 'utc')::date as day,
      event_type,
      count(*)::int as event_count
    from public.events
    where created_at < cutoff_at
    group by 1, 2
  ),
  totals as (
    select coalesce(sum(event_count), 0)::bigint as total
    from expired
  ),
  upserted as (
    insert into public.event_daily (day, event_type, "count")
    select day, event_type, event_count
    from expired
    on conflict (day, event_type) do update
      set "count" = public.event_daily."count" + excluded."count"
    returning 1
  )
  select totals.total
  into rolled_up_events
  from totals
  cross join (select count(*) from upserted) as applied;

  with deleted as (
    delete from public.events
    where created_at < cutoff_at
    returning 1
  )
  select count(*)
  into deleted_events
  from deleted;

  return jsonb_build_object(
    'retention_days', retention_days,
    'cutoff_at', cutoff_at,
    'rolled_up_events', rolled_up_events,
    'deleted_events', deleted_events
  );
end;
$$;

revoke all on function public.rollup_expired_events(integer) from public;
grant execute on function public.rollup_expired_events(integer) to service_role;

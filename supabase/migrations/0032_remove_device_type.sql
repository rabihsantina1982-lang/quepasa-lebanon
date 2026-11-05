-- Stop keeping the visitor's device type (phone / tablet / computer): it
-- wasn't useful. The app stopped recording it on 5 Nov 2026; this removes it
-- from the stats functions and deletes the column with the data already
-- stored. Access rights on the functions are unchanged.
--
-- Safe to re-run.

create or replace function my_traffic_stats()
returns table (event_id uuid, dimension text, bucket text, visits bigint)
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select 1 from profiles
    where id = auth.uid() and (role = 'admin' or pro_until > now())
  ),
  v as (
    select a.event_id, a.source, a.locale
    from event_activity a
    join events e on e.id = a.event_id
    where e.user_id = auth.uid() and a.kind = 'view' and exists (select 1 from me)
  ),
  dims as (
    select v.event_id, 'source'::text as dimension, v.source as bucket from v
    union all
    select v.event_id, 'language', nullif(v.locale, '') from v
  ),
  per_event as (
    select d.event_id, d.dimension, d.bucket, count(*)::bigint as n
    from dims d where d.bucket is not null
    group by 1, 2, 3
  ),
  overall as (
    select null::uuid as event_id, p.dimension, p.bucket, sum(p.n)::bigint as n
    from per_event p
    group by 2, 3
  ),
  all_rows as (
    select * from per_event
    union all
    select * from overall
  )
  select x.event_id, x.dimension, x.bucket, x.n
  from (
    select r.*, sum(r.n) over (partition by r.event_id, r.dimension) as total
    from all_rows r
  ) x
  where x.total >= 10;
$$;

create or replace function admin_insights(p_days int default 30, p_tz text default 'Asia/Dubai')
returns table (dimension text, bucket text, views bigint, ticket_clicks bigint)
language sql
security definer
stable
set search_path = public
as $$
  with a as (
    select ac.event_id, ac.kind, ac.source, ac.locale, ac.created_at, e.category_id,
           coalesce(to_jsonb(e) ->> 'emirate', to_jsonb(e) ->> 'governorate') as region
    from event_activity ac
    join events e on e.id = ac.event_id
    where is_admin()
      and ac.created_at >= now() - make_interval(days => greatest(1, least(p_days, 366)))
  )
  select 'total', 'all', count(*) filter (where kind = 'view'), count(*) filter (where kind = 'ticket_click') from a
  union all
  select 'category', coalesce(c.slug, 'none'), count(*) filter (where a.kind = 'view'), count(*) filter (where a.kind = 'ticket_click')
  from a left join categories c on c.id = a.category_id group by 2
  union all
  select 'region', coalesce(region, 'none'), count(*) filter (where kind = 'view'), count(*) filter (where kind = 'ticket_click')
  from a group by 2
  union all
  select 'source', source, count(*), 0 from a where kind = 'view' and source is not null group by 2
  union all
  select 'language', locale, count(*), 0 from a where kind = 'view' and locale is not null group by 2
  union all
  select 'day', to_char(created_at at time zone p_tz, 'YYYY-MM-DD'), count(*) filter (where kind = 'view'), count(*) filter (where kind = 'ticket_click')
  from a group by 2
  union all
  select 'event', event_id::text, count(*) filter (where kind = 'view'), count(*) filter (where kind = 'ticket_click')
  from a group by 2;
$$;

create or replace function pro_weekly_stats(p_user uuid, p_from timestamptz, p_to timestamptz)
returns table (event_id uuid, metric text, bucket text, n bigint)
language sql
security definer
stable
set search_path = public
as $$
  with ev as (select id from events where user_id = p_user),
  act as (
    select a.event_id, a.kind, a.source, a.locale
    from event_activity a
    where a.event_id in (select id from ev) and a.created_at >= p_from and a.created_at < p_to
  ),
  breakdown as (
    select 'source'::text as metric, source as bucket, count(*)::bigint as n from act where kind = 'view' and source is not null group by 2
    union all
    select 'language', locale, count(*) from act where kind = 'view' and locale is not null group by 2
  )
  select act.event_id, 'views', '', count(*) from act where kind = 'view' group by 1
  union all
  select act.event_id, 'ticket_clicks', '', count(*) from act where kind = 'ticket_click' group by 1
  union all
  select f.event_id, 'saves', '', count(*) from favorites f
  where f.event_id in (select id from ev) and f.created_at >= p_from and f.created_at < p_to group by 1
  union all
  select r.event_id, 'reminders', '', count(*) from reminders r
  where r.event_id in (select id from ev) and r.created_at >= p_from and r.created_at < p_to group by 1
  union all
  select s.event_id, 'shares', '', count(*) from share_events s
  where s.event_id in (select id from ev) and s.created_at >= p_from and s.created_at < p_to group by 1
  union all
  select null::uuid, b.metric, b.bucket, b.n
  from (select breakdown.*, sum(breakdown.n) over (partition by breakdown.metric) as total from breakdown) b
  where b.total >= 10;
$$;

alter table event_activity drop column if exists device;

notify pgrst, 'reload schema';

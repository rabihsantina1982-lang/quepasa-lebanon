-- Promoter stats: where viewers come from, their language and device, how a
-- boost / spotlight performed, and a 10-person privacy minimum.
--
--  * event_activity.source  -- where a view came from (browse, boost,
--    spotlight, other QuePasa pages, WhatsApp, a shared link, Google,
--    Instagram, Facebook, other websites, direct). Counts only.
--  * event_activity.device  -- mobile / tablet / desktop.
--  * my_traffic_stats()     -- those breakdowns (plus language) per event and
--    across all of the caller's events. Pro (or admin) only. A breakdown is
--    returned only once it covers at least 10 visits.
--  * my_promotion_results() -- views and ticket clicks during each boost /
--    spotlight versus the same length of time just before it started.
--  * my_audience_stats()    -- unchanged, except it now returns nothing until
--    at least 10 people are in the audience, so no one can be singled out.
--
-- Every statement is idempotent (safe to re-run).

alter table event_activity add column if not exists source text;
alter table event_activity add column if not exists device text;

-- ---------- traffic breakdown ----------
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
    select a.event_id, a.source, a.locale, a.device
    from event_activity a
    join events e on e.id = a.event_id
    where e.user_id = auth.uid() and a.kind = 'view' and exists (select 1 from me)
  ),
  dims as (
    select v.event_id, 'source'::text as dimension, v.source as bucket from v
    union all
    select v.event_id, 'language', nullif(v.locale, '') from v
    union all
    select v.event_id, 'device', v.device from v
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

grant execute on function my_traffic_stats() to authenticated;

-- ---------- boost / spotlight results ----------
create or replace function my_promotion_results()
returns table (
  promotion_id uuid,
  event_id uuid,
  kind text,
  starts_at timestamptz,
  ends_at timestamptz,
  views_during bigint,
  clicks_during bigint,
  views_before bigint,
  clicks_before bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with p as (
    select pr.id, pr.event_id, pr.kind, pr.starts_at, pr.ends_at,
           least(pr.ends_at, now()) as until,
           pr.starts_at - (least(pr.ends_at, now()) - pr.starts_at) as before_from
    from event_promotions pr
    join events e on e.id = pr.event_id
    where e.user_id = auth.uid() and pr.starts_at < now()
  )
  select p.id, p.event_id, p.kind, p.starts_at, p.ends_at,
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'view'
       and a.created_at >= p.starts_at and a.created_at < p.until),
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'ticket_click'
       and a.created_at >= p.starts_at and a.created_at < p.until),
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'view'
       and a.created_at >= p.before_from and a.created_at < p.starts_at),
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'ticket_click'
       and a.created_at >= p.before_from and a.created_at < p.starts_at)
  from p;
$$;

grant execute on function my_promotion_results() to authenticated;

-- ---------- audience: 10-person minimum ----------
create or replace function my_audience_stats()
returns table (dimension text, bucket text, people bigint)
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select 1 from profiles
    where id = auth.uid() and (role = 'admin' or pro_until > now())
  ),
  audience as (
    select distinct u.user_id from (
      select f.user_id from favorites f join events e on e.id = f.event_id where e.user_id = auth.uid()
      union
      select r.user_id from reminders r join events e on e.id = r.event_id where e.user_id = auth.uid()
      union
      select a.user_id from event_activity a join events e on e.id = a.event_id
      where e.user_id = auth.uid() and a.kind = 'ticket_click' and a.user_id is not null
    ) u
    where exists (select 1 from me)
  ),
  people as (
    select p.gender, extract(year from age(p.date_of_birth))::int as years
    from audience au join profiles p on p.id = au.user_id
  ),
  enough as (
    select 1 where (select count(*) from people) >= 10
  )
  select 'gender', coalesce(gender, 'unknown'), count(*) from people
  where exists (select 1 from enough)
  group by 2
  union all
  select 'age',
    case
      when years is null then 'unknown'
      when years < 18 then 'under_18'
      when years < 25 then '18_24'
      when years < 35 then '25_34'
      when years < 45 then '35_44'
      else '45_plus'
    end,
    count(*)
  from people
  where exists (select 1 from enough)
  group by 2;
$$;

grant execute on function my_audience_stats() to authenticated;

notify pgrst, 'reload schema';

-- Admin Insights page + weekly Pro email.
--
--  * admin_insights(days, tz)          -- visits and ticket clicks across the
--    whole platform for the last N days: totals, by category, region, source,
--    language, device, day and event. Admins only.
--  * admin_promotion_results(days)     -- how every boost / spotlight running
--    in that window did versus the same length of time just before it.
--  * pro_weekly_stats(user, from, to)  -- one promoter's numbers for the
--    weekly Pro email. Only the server (service-role key) can call it.
--  * reminders.created_at              -- so reminders can be counted per week.
--
-- Every statement is idempotent (safe to re-run).

alter table reminders add column if not exists created_at timestamptz not null default now();

-- ---------- platform-wide insights (admins) ----------
create or replace function admin_insights(p_days int default 30, p_tz text default 'Asia/Dubai')
returns table (dimension text, bucket text, views bigint, ticket_clicks bigint)
language sql
security definer
stable
set search_path = public
as $$
  with a as (
    select ac.event_id, ac.kind, ac.source, ac.locale, ac.device, ac.created_at, e.category_id,
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
  select 'device', device, count(*), 0 from a where kind = 'view' and device is not null group by 2
  union all
  select 'day', to_char(created_at at time zone p_tz, 'YYYY-MM-DD'), count(*) filter (where kind = 'view'), count(*) filter (where kind = 'ticket_click')
  from a group by 2
  union all
  select 'event', event_id::text, count(*) filter (where kind = 'view'), count(*) filter (where kind = 'ticket_click')
  from a group by 2;
$$;

grant execute on function admin_insights(int, text) to authenticated;

create or replace function admin_promotion_results(p_days int default 30)
returns table (
  promotion_id uuid, event_id uuid, kind text, starts_at timestamptz, ends_at timestamptz,
  views_during bigint, clicks_during bigint, views_before bigint, clicks_before bigint
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
    where is_admin()
      and pr.starts_at < now()
      and pr.ends_at > now() - make_interval(days => greatest(1, least(p_days, 366)))
  )
  select p.id, p.event_id, p.kind, p.starts_at, p.ends_at,
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'view' and a.created_at >= p.starts_at and a.created_at < p.until),
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'ticket_click' and a.created_at >= p.starts_at and a.created_at < p.until),
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'view' and a.created_at >= p.before_from and a.created_at < p.starts_at),
    (select count(*) from event_activity a where a.event_id = p.event_id and a.kind = 'ticket_click' and a.created_at >= p.before_from and a.created_at < p.starts_at)
  from p;
$$;

grant execute on function admin_promotion_results(int) to authenticated;

-- ---------- one promoter's week (weekly Pro email; server only) ----------
-- Per event: views, ticket_clicks, saves, reminders, shares in the window.
-- Across all their events (event_id null): source / language / device of
-- views, only when that breakdown covers at least 10 visits.
create or replace function pro_weekly_stats(p_user uuid, p_from timestamptz, p_to timestamptz)
returns table (event_id uuid, metric text, bucket text, n bigint)
language sql
security definer
stable
set search_path = public
as $$
  with ev as (select id from events where user_id = p_user),
  act as (
    select a.event_id, a.kind, a.source, a.locale, a.device
    from event_activity a
    where a.event_id in (select id from ev) and a.created_at >= p_from and a.created_at < p_to
  ),
  breakdown as (
    select 'source'::text as metric, source as bucket, count(*)::bigint as n from act where kind = 'view' and source is not null group by 2
    union all
    select 'language', locale, count(*) from act where kind = 'view' and locale is not null group by 2
    union all
    select 'device', device, count(*) from act where kind = 'view' and device is not null group by 2
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

revoke execute on function pro_weekly_stats(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function pro_weekly_stats(uuid, timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';

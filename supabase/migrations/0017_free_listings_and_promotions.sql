-- Free, unlimited listings + paid visibility.
--
-- Listing events is now free for every promoter (the old Standard plan's
-- 5-posts-a-month limit is gone). Money comes from:
--   * Boost      -- an event is pinned to the top of Browse with a Featured badge
--   * Spotlight  -- an event appears in the banner at the top of the homepage
--   * Pro        -- full stats (ticket clicks, shares, audience), a Verified
--                   badge, and one free boost week a month
-- Promoters REQUEST these from their dashboard (promotion_requests); an admin
-- approves once paid, which creates the actual event_promotions row or
-- extends profiles.pro_until. Payment itself happens outside the app for now.
--
-- Every statement is idempotent (safe to re-run).

-- ---------- Pro status lives on the profile (public, for the Verified badge) ----------
alter table profiles add column if not exists pro_until timestamptz;
grant select (pro_until) on profiles to anon, authenticated;

-- Owners can update their own profile row (profiles_self_update), so block
-- them from granting themselves Pro -- same trigger that already blocks
-- self-promotion of role (0010).
create or replace function prevent_self_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Cannot change role directly -- go through the promoter application / admin approval flow.';
    end if;
    if new.pro_until is distinct from old.pro_until then
      raise exception 'Cannot change Pro status directly -- request it from the promoter dashboard.';
    end if;
  end if;
  return new;
end;
$$;

-- Existing promoters on the old 3-month trial keep Pro until the trial would
-- have ended; the subscriptions table is no longer read by the app.
update profiles p
set pro_until = s.trial_ends_at
from subscriptions s
where s.user_id = p.id
  and s.plan = 'trial'
  and s.trial_ends_at > now()
  and p.pro_until is null;

-- ---------- active promotions (admin-written, public-read) ----------
-- Kept in their own table rather than as columns on events, because event
-- owners can update their own event rows.
create table if not exists event_promotions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  kind text not null check (kind in ('boost', 'spotlight')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists event_promotions_event_idx on event_promotions (event_id);
create index if not exists event_promotions_ends_idx on event_promotions (ends_at);

alter table event_promotions enable row level security;

drop policy if exists "event_promotions_public_read" on event_promotions;
create policy "event_promotions_public_read" on event_promotions for select using (true);

drop policy if exists "event_promotions_admin_all" on event_promotions;
create policy "event_promotions_admin_all" on event_promotions for all using (is_admin()) with check (true);

-- ---------- requests from promoters ----------
create table if not exists promotion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,  -- null for Pro
  kind text not null check (kind in ('boost', 'spotlight', 'pro')),
  duration int not null default 1 check (duration between 1 and 12),  -- weeks (boost/spotlight) or months (pro)
  use_free_boost boolean not null default false,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'pro') = (event_id is null))
);
create index if not exists promotion_requests_status_idx on promotion_requests (status);
create index if not exists promotion_requests_user_idx on promotion_requests (user_id);

alter table promotion_requests enable row level security;

-- A promoter can only request for their own events, and only as 'pending'.
drop policy if exists "promotion_requests_owner_insert" on promotion_requests;
create policy "promotion_requests_owner_insert" on promotion_requests for insert with check (
  auth.uid() = user_id
  and status = 'pending'
  and (event_id is null or exists (select 1 from events e where e.id = event_id and e.user_id = auth.uid()))
);

drop policy if exists "promotion_requests_owner_select" on promotion_requests;
create policy "promotion_requests_owner_select" on promotion_requests for select using (auth.uid() = user_id);

drop policy if exists "promotion_requests_admin_all" on promotion_requests;
create policy "promotion_requests_admin_all" on promotion_requests for all using (is_admin()) with check (true);

-- ---------- stats: add ticket clicks this week ----------
-- Return type changes, so the old function has to be dropped first.
drop function if exists my_event_stats();
create function my_event_stats()
returns table (
  event_id uuid,
  views bigint,
  views_7d bigint,
  ticket_clicks bigint,
  ticket_clicks_7d bigint,
  saves bigint,
  reminders bigint,
  shares bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    e.id,
    (select count(*) from event_activity a where a.event_id = e.id and a.kind = 'view'),
    (select count(*) from event_activity a where a.event_id = e.id and a.kind = 'view' and a.created_at > now() - interval '7 days'),
    (select count(*) from event_activity a where a.event_id = e.id and a.kind = 'ticket_click'),
    (select count(*) from event_activity a where a.event_id = e.id and a.kind = 'ticket_click' and a.created_at > now() - interval '7 days'),
    (select count(*) from favorites f where f.event_id = e.id),
    (select count(*) from reminders r where r.event_id = e.id),
    (select count(*) from share_events s where s.event_id = e.id)
  from events e
  where e.user_id = auth.uid();
$$;

grant execute on function my_event_stats() to authenticated;

-- ---------- Pro: audience breakdown ----------
-- Age group and gender of the signed-in people who saved, set a reminder on,
-- or clicked "Get tickets" for any of the caller's events. Counts only, never
-- individuals. Returns nothing unless the caller has Pro (or is an admin).
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
  )
  select 'gender', coalesce(gender, 'unknown'), count(*) from people group by 2
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
  from people group by 2;
$$;

grant execute on function my_audience_stats() to authenticated;

notify pgrst, 'reload schema';

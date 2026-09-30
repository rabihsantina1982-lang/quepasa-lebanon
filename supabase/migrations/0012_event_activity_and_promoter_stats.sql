-- Per-event activity tracking for promoter stats: page views and
-- "Get tickets" / "Call to book" clicks. Saves, reminders and shares are
-- already recorded in favorites, reminders and share_events.

create table if not exists event_activity (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  kind text not null check (kind in ('view', 'ticket_click')),
  user_id uuid references auth.users(id) on delete set null,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);
create index if not exists event_activity_event_kind_idx on event_activity (event_id, kind);

alter table event_activity enable row level security;

-- Anyone (including anonymous visitors) can log activity; only admins can
-- read raw rows. Promoters get aggregated numbers via my_event_stats().
drop policy if exists "event_activity_insert_anyone" on event_activity;
create policy "event_activity_insert_anyone" on event_activity for insert with check (true);

drop policy if exists "event_activity_admin_read" on event_activity;
create policy "event_activity_admin_read" on event_activity for select using (is_admin());

-- Aggregated stats for the signed-in promoter's own events only. SECURITY
-- DEFINER so it can count rows in tables the promoter can't read directly
-- (other users' favorites/reminders, admin-only activity/share rows), while
-- the auth.uid() filter limits it to events they own.
create or replace function my_event_stats()
returns table (
  event_id uuid,
  views bigint,
  views_7d bigint,
  ticket_clicks bigint,
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
    (select count(*) from favorites f where f.event_id = e.id),
    (select count(*) from reminders r where r.event_id = e.id),
    (select count(*) from share_events s where s.event_id = e.id)
  from events e
  where e.user_id = auth.uid();
$$;

grant execute on function my_event_stats() to authenticated;

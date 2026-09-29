-- Consumer-side profile demographics (date of birth, gender, interests) so
-- we can report on age groups / gender split / interest popularity, plus a
-- share_events table so link shares can be counted per event/channel.
-- Only ever collected/shown for role='user' accounts — promoters/admins are
-- businesses, not the consumer audience being profiled here.

alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists gender text check (gender in ('male', 'female', 'non_binary'));
alter table profiles add column if not exists interests jsonb not null default '[]'::jsonb;
-- Set the moment the user either submits or explicitly skips the one-time
-- onboarding prompt, so we never ask again regardless of what they chose.
alter table profiles add column if not exists onboarding_completed_at timestamptz;

-- ---------- share_events: counts link shares per event/channel ----------
create table if not exists share_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  channel text not null,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);
create index if not exists share_events_event_idx on share_events (event_id);

alter table share_events enable row level security;

drop policy if exists "share_events_insert_anyone" on share_events;
create policy "share_events_insert_anyone" on share_events for insert with check (true);

drop policy if exists "share_events_admin_read" on share_events;
create policy "share_events_admin_read" on share_events for select using (is_admin());

-- "Report this event": signed-in visitors flag fake tickets, wrong details,
-- cancelled events, impersonation or offensive content. Admins review the
-- reports on /admin and hide the event or dismiss the report.
--
-- Idempotent (safe to re-run).

create table if not exists event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('scam', 'wrong_info', 'cancelled', 'impersonation', 'offensive', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- One open report per person per event (stops one account spamming).
create unique index if not exists event_reports_one_open
  on event_reports (event_id, user_id) where status = 'open';
create index if not exists event_reports_status_idx on event_reports (status, created_at);

alter table event_reports enable row level security;

-- Reporters can file a report as themselves, on an event they can see, and
-- read their own. They can't edit, close or read anyone else's.
drop policy if exists "event_reports_owner_insert" on event_reports;
create policy "event_reports_owner_insert" on event_reports for insert with check (
  auth.uid() = user_id
  and status = 'open'
  and resolved_at is null
  and exists (select 1 from events e where e.id = event_id and e.status = 'published')
);

drop policy if exists "event_reports_owner_read" on event_reports;
create policy "event_reports_owner_read" on event_reports for select using (auth.uid() = user_id);

drop policy if exists "event_reports_admin_all" on event_reports;
create policy "event_reports_admin_all" on event_reports for all using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';

-- Stats integrity: views, ticket clicks and shares are what promoters pay
-- Pro for, but anyone could insert rows straight into event_activity and
-- share_events with the public anon key (insert policies were "with check
-- (true)"), inflating counts or attaching rows to other users' ids (which
-- also skews the Pro audience age/gender stats).
--
-- Now only the server writes these rows (service role, which bypasses RLS),
-- after de-duplicating per visitor in /api/track and /api/share/track.
-- `visitor` is a keyed hash of IP + browser (or the signed-in user id), never
-- the raw IP.
--
-- Idempotent (safe to re-run).

drop policy if exists "event_activity_insert_anyone" on event_activity;
drop policy if exists "share_events_insert_anyone" on share_events;

alter table event_activity add column if not exists visitor text;
alter table share_events add column if not exists visitor text;

create index if not exists event_activity_visitor_idx on event_activity (visitor, created_at);
create index if not exists share_events_visitor_idx on share_events (visitor, created_at);

notify pgrst, 'reload schema';

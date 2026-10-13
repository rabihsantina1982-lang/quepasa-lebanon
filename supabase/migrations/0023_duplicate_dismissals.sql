-- Possible duplicate events (src/lib/duplicates.ts) are worked out on the
-- fly; this table only remembers pairs an admin marked "Not duplicates" so
-- they stop showing on /admin. event_a < event_b (text order) so each pair
-- is stored once. Deleting either event removes the row.
create table if not exists duplicate_dismissals (
  event_a uuid not null references events(id) on delete cascade,
  event_b uuid not null references events(id) on delete cascade,
  dismissed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_a, event_b)
);

alter table duplicate_dismissals enable row level security;

drop policy if exists "duplicate_dismissals_admin_all" on duplicate_dismissals;
create policy "duplicate_dismissals_admin_all" on duplicate_dismissals for all using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';

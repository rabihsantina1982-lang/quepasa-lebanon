-- Security fix: every "admin can do everything" policy was written as
--   for all using (<is admin>) with check (true)
-- For INSERT, Postgres only evaluates WITH CHECK (never USING), so
-- "with check (true)" let ANYONE -- even anonymous visitors with the public
-- anon key -- insert rows into these tables directly through the API:
--   * events          -> publish an event, skipping review
--   * event_media     -> attach images/videos to any event
--   * profiles        -> create profile rows
--   * promoter_applications, subscriptions, ingestion_runs
--   * event_promotions -> give any event a free boost / spotlight (0017)
--   * promotion_requests -> file a request as someone else (0017)
-- Confirmed by inserting an event_promotions row with only the anon key.
--
-- Legitimate non-admin writes are unaffected: they go through their own,
-- properly scoped policies (events_insert_authenticated, event_media_owner_insert,
-- promoter_applications_owner_insert, promotion_requests_owner_insert, ...)
-- or the service-role key (ingestion, server routes), which bypasses RLS.
--
-- Idempotent (safe to re-run).

drop policy if exists "events_admin_all" on events;
create policy "events_admin_all" on events for all using (is_admin()) with check (is_admin());

drop policy if exists "event_media_admin_write" on event_media;
create policy "event_media_admin_write" on event_media for all using (is_admin()) with check (is_admin());

drop policy if exists "ingestion_runs_admin" on ingestion_runs;
create policy "ingestion_runs_admin" on ingestion_runs for all using (is_admin()) with check (is_admin());

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all using (is_admin()) with check (is_admin());

drop policy if exists "promoter_applications_admin_all" on promoter_applications;
create policy "promoter_applications_admin_all" on promoter_applications for all using (is_admin()) with check (is_admin());

drop policy if exists "subscriptions_admin_all" on subscriptions;
create policy "subscriptions_admin_all" on subscriptions for all using (is_admin()) with check (is_admin());

drop policy if exists "event_promotions_admin_all" on event_promotions;
create policy "event_promotions_admin_all" on event_promotions for all using (is_admin()) with check (is_admin());

drop policy if exists "promotion_requests_admin_all" on promotion_requests;
create policy "promotion_requests_admin_all" on promotion_requests for all using (is_admin()) with check (is_admin());

-- Remove anything that may have been slipped in through the hole: boosts are
-- only ever created by an admin approving a request, which this checks for.
delete from event_promotions p
where not exists (
  select 1 from promotion_requests r
  where r.event_id = p.event_id and r.kind = p.kind and r.status = 'approved'
);

notify pgrst, 'reload schema';

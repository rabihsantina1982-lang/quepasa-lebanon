-- Promoter trust & safety:
--   * Verified badge is now its own thing (profiles.verified_at), given by an
--     admin after checking identity -- no longer bundled with paid Pro.
--   * Applications get a verification code the applicant puts in their
--     Instagram bio, so we can tell the real account applied (not an
--     impersonator), plus the phone number the form always asked for but
--     never saved.
--   * Admins can suspend a promoter (profiles.suspended_at): all their events
--     disappear from the public site, their profile leaves Connect, and they
--     can't post events or request promotions until unsuspended.
--   * Closes a review bypass: owners could publish their own events (below).
--
-- Idempotent (safe to re-run).

alter table profiles add column if not exists verified_at timestamptz;
alter table profiles add column if not exists suspended_at timestamptz;
grant select (verified_at) on profiles to anon, authenticated;
-- Owners need to see their own suspension on the dashboard. Suspended
-- profiles aren't publicly readable (policy below), so this exposes nothing.
grant select (suspended_at) on profiles to authenticated;

alter table promoter_applications add column if not exists verification_code text;
alter table promoter_applications add column if not exists phone text;

-- SECURITY DEFINER so policies can check suspension without depending on
-- the caller's own read access to profiles.
create or replace function is_suspended(uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = uid and suspended_at is not null);
$$;

-- Owners can update their own profile row: block self-changes to role, Pro,
-- verification and suspension (extends 0010 / 0017).
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
    if new.verified_at is distinct from old.verified_at or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Cannot change verification or suspension directly.';
    end if;
  end if;
  return new;
end;
$$;

-- ---------- suspended promoters disappear from the public site ----------
drop policy if exists "events_public_read_published" on events;
create policy "events_public_read_published" on events for select
  using (status = 'published' and (user_id is null or not is_suspended(user_id)));

drop policy if exists "profiles_public_promoter_read" on profiles;
create policy "profiles_public_promoter_read" on profiles for select
  using ((role = 'promoter' or (role = 'admin' and profile_type is not null)) and suspended_at is null);

-- ---------- ...and can't post or request promotions ----------
drop policy if exists "events_insert_authenticated" on events;
create policy "events_insert_authenticated" on events for insert
  with check (auth.uid() is not null and (status = 'pending' or status = 'draft') and not is_suspended(auth.uid()));

-- events_owner_update (0001) had no WITH CHECK, so a submitter could set
-- their own pending event's status to 'published' through the API and skip
-- review. The app never updates events as the owner; owners may only keep
-- them pending/draft (admins publish via events_admin_all).
drop policy if exists "events_owner_update" on events;
create policy "events_owner_update" on events for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by and status in ('pending', 'draft') and not is_suspended(auth.uid()));

drop policy if exists "promotion_requests_owner_insert" on promotion_requests;
create policy "promotion_requests_owner_insert" on promotion_requests for insert with check (
  auth.uid() = user_id
  and status = 'pending'
  and not is_suspended(auth.uid())
  and (event_id is null or exists (select 1 from events e where e.id = event_id and e.user_id = auth.uid()))
);

notify pgrst, 'reload schema';

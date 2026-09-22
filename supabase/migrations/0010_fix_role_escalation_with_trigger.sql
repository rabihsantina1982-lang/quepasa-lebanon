-- Migration 0009 tried to block self role-escalation via an RLS WITH CHECK
-- that re-read the row's role from inside the same UPDATE. Verified live
-- that this does NOT work: a WITH CHECK subquery sees the row AFTER the
-- update has already been applied within that same command, so it ended up
-- comparing the new role against itself and always passed. Confirmed by
-- directly testing a self-escalation attempt after running 0009 -- it
-- still succeeded.
--
-- RLS policies can't reference the pre-update row at all; only a trigger's
-- OLD/NEW pseudo-rows can. This migration replaces that approach with a
-- BEFORE UPDATE trigger, which is the correct tool for "this column can't
-- change except by an admin".

-- Revert profiles_self_update to a plain, symmetrical policy -- it no
-- longer needs to (and cannot correctly) encode the role rule itself.
drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No longer used now that the check is a trigger, not an RLS subquery.
drop function if exists current_profile_role(uuid);

create or replace function prevent_self_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for service-role/backend connections (the API
  -- routes and scripts that already hold the secret service-role key --
  -- an inherently trusted context, e.g. fixing a stale role by hand).
  -- Only block role changes made by an authenticated, non-admin session --
  -- that's the actual self-escalation path this migration closes.
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin() then
    raise exception 'Cannot change role directly -- go through the promoter application / admin approval flow.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_role_change on profiles;
create trigger profiles_prevent_self_role_change
  before update on profiles
  for each row
  execute function prevent_self_role_change();

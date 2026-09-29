-- Fix a real privilege-escalation gap: profiles_self_update (0001_init.sql)
-- had no restriction on which columns a user could change on their own
-- profile, including role -- any signed-in user could set their own role to
-- admin/promoter via a direct client-side call, bypassing approval.
--
-- Ported from QuePasa UAE, where an RLS WITH CHECK approach was tried first
-- and proven not to work (a WITH CHECK subquery sees the row AFTER the
-- update, so it compares the new role against itself and always passes).
-- RLS can't see the pre-update row; a BEFORE UPDATE trigger's OLD/NEW can.

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

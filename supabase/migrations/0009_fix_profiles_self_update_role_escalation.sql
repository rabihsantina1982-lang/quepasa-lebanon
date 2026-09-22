-- Fix a real privilege-escalation gap: profiles_self_update (0001_init.sql)
-- lets a signed-in user update their OWN profile row but never restricted
-- WHICH columns can change -- including role. Any signed-in user could set
-- their own role to 'admin' or 'promoter' directly via a client-side
-- Supabase call, bypassing the promoter-application/admin-approval flow.
--
-- Fix: add a WITH CHECK that requires role to stay whatever it already was.
-- Reading the *current* role via a SECURITY DEFINER helper (mirroring
-- is_admin() from migration 0005) avoids the same self-referencing RLS
-- recursion (42P17) that function was built to sidestep -- a plain
-- subquery against profiles here would re-trigger this very policy.
-- Admins are unaffected: profiles_admin_all (0005) is a separate policy
-- that still allows role changes during promoter approval.

create or replace function current_profile_role(p_id uuid) returns user_role
language sql security definer stable set search_path = public as $$
  select role from profiles where id = p_id;
$$;

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = current_profile_role(id));

-- Fixes "infinite recursion detected in policy for relation profiles".
-- profiles_admin_all checked EXISTS(SELECT ... FROM profiles) inside a policy
-- ON profiles itself, so evaluating it re-triggered itself forever.
-- A SECURITY DEFINER function run by the table owner bypasses RLS internally,
-- so it can safely check the caller's role without recursing.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all using (public.is_admin()) with check (public.is_admin());

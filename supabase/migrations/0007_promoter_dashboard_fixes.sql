-- Fixes real, previously-undiscovered bugs in the promoter approval pipeline,
-- found while testing the /promoter and /admin dashboards for mobile polish.
-- The submit->approve flow was previously verified using a single admin
-- account that approved its own application, which trivially passes
-- self-only RLS policies and masked every issue below. Verified end-to-end
-- against a real second test account (not the admin's own) that every step
-- listed here was actually broken before this migration, and works after it.
--
-- Every statement is idempotent (safe to run against the current live
-- database, and safe to re-run).

-- ---------- profiles: add email, needed by the admin promoter queue ----------
alter table profiles add column if not exists email text;

update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email)
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------- admin-check helper, bypasses RLS to avoid self-referencing recursion ----------
-- A policy ON profiles that reads profiles to check "is this user an admin"
-- re-triggers RLS on that same nested read, which re-evaluates the same
-- policy again -- Postgres detects this as infinite recursion (42P17) and
-- errors. A SECURITY DEFINER function sidesteps this: it runs as the
-- function owner, which isn't subject to RLS here (FORCE ROW LEVEL
-- SECURITY was never set on profiles).
create or replace function is_admin() returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- profiles: admin needs to update/read OTHER users' rows ----------
-- Approving a promoter application sets profiles.role = 'promoter' on the
-- APPLICANT's row, not the admin's own -- profiles_self_update (0001) only
-- ever allowed auth.uid() = id, so this always silently failed for a real
-- (non-self) approval. The admin app code doesn't check the error, so the
-- UI reported success while the applicant's role never actually changed.
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all using (is_admin()) with check (true);

-- ---------- promoter_applications: not in any migration file until now ----------
create table if not exists promoter_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  business_name text not null,
  business_type text not null,
  website text,
  instagram text,
  description text not null,
  status text not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Retrofit the FK on the already-existing live table (create table if not
-- exists above is a no-op there). Required for the admin panel's
-- `profiles(display_name, email)` embedded-select syntax to resolve at all
-- -- PostgREST needs an explicit FK targeting `profiles` specifically to do
-- this. The live table already had a same-named, auto-generated constraint
-- from when it was first created, but it pointed at auth.users, not
-- profiles -- so a plain "if constraint name doesn't exist" guard silently
-- no-ops and leaves the wrong target in place. Check what it actually
-- points to and fix it if needed.
do $$
declare
  target text;
begin
  select confrelid::regclass::text into target
  from pg_constraint
  where conname = 'promoter_applications_user_id_fkey';

  if target is null then
    alter table promoter_applications
      add constraint promoter_applications_user_id_fkey
      foreign key (user_id) references profiles(id) on delete cascade;
  elsif target <> 'profiles' then
    alter table promoter_applications drop constraint promoter_applications_user_id_fkey;
    alter table promoter_applications
      add constraint promoter_applications_user_id_fkey
      foreign key (user_id) references profiles(id) on delete cascade;
  end if;
end $$;

alter table promoter_applications enable row level security;

drop policy if exists "promoter_applications_owner_insert" on promoter_applications;
create policy "promoter_applications_owner_insert" on promoter_applications for insert with check (auth.uid() = user_id);

drop policy if exists "promoter_applications_owner_select" on promoter_applications;
create policy "promoter_applications_owner_select" on promoter_applications for select using (auth.uid() = user_id);

-- Admins had NO select/update access at all -- the admin panel's "Promoter
-- Applications" queue always rendered empty, and even a successful-looking
-- approve/reject click never actually updated the row's status.
drop policy if exists "promoter_applications_admin_all" on promoter_applications;
create policy "promoter_applications_admin_all" on promoter_applications for all using (is_admin()) with check (true);

-- ---------- subscriptions: not in any migration file until now ----------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  plan text not null default 'trial',
  status text not null default 'active',
  trial_ends_at timestamptz,
  posts_used_this_month int not null default 0,
  period_start timestamptz not null default now(),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_user_id_key'
  ) then
    alter table subscriptions add constraint subscriptions_user_id_key unique (user_id);
  end if;
end $$;

alter table subscriptions enable row level security;

drop policy if exists "subscriptions_owner_select" on subscriptions;
create policy "subscriptions_owner_select" on subscriptions for select using (auth.uid() = user_id);

-- Admins had NO write access at all -- approving an application's
-- "create a 3-month free trial subscription" step always silently failed
-- with an RLS violation (confirmed: 42501, new row violates row-level
-- security policy).
drop policy if exists "subscriptions_admin_all" on subscriptions;
create policy "subscriptions_admin_all" on subscriptions for all using (is_admin()) with check (true);

-- ---------- once this file has been run: reload PostgREST's schema cache ----------
-- NOTIFY pgrst, 'reload schema'; often doesn't propagate through Supabase's
-- pooled connection. If new columns/tables/relationships still 404 or
-- PGRST200 after running this file, use the dashboard instead: Settings ->
-- Infrastructure -> Restart project (reliably forces a fresh cache).

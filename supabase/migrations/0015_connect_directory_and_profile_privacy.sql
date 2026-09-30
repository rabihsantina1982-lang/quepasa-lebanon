-- "Connect": a public directory of everyone advertising on the app (artists,
-- DJs, organizers, venues, businesses, promoters), each with a type, a short
-- bio, and contact details that only signed-in users can see.
--
-- Also closes a privacy gap: profiles_public_promoter_read (0006) exposed
-- EVERY column of a promoter's profile row to anyone, including private
-- ones (email, date of birth, gender, interests). Row-level security can't
-- hide individual columns, so column privileges now limit what the public
-- API roles can read. Server code that needs private columns uses the
-- service-role client (analytics, reminder emails, admin approval queue).

-- ---------- directory fields ----------
alter table profiles add column if not exists profile_type text
  check (profile_type in ('artist', 'dj', 'organizer', 'venue', 'business', 'promoter'));
alter table profiles add column if not exists bio text;

-- Promoters are listed; an admin account is listed only once it opts in by
-- choosing a type (so staff accounts stay private by default).
drop policy if exists "profiles_public_promoter_read" on profiles;
create policy "profiles_public_promoter_read" on profiles for select
  using (role = 'promoter' or (role = 'admin' and profile_type is not null));

-- ---------- contact details: signed-in users only ----------
create table if not exists profile_contacts (
  user_id uuid primary key references profiles(id) on delete cascade,
  phone text,
  whatsapp text,
  email text,
  instagram text,
  website text,
  updated_at timestamptz not null default now()
);
alter table profile_contacts enable row level security;

drop policy if exists "profile_contacts_read_signed_in" on profile_contacts;
create policy "profile_contacts_read_signed_in" on profile_contacts for select
  using (auth.uid() is not null);

drop policy if exists "profile_contacts_own_write" on profile_contacts;
create policy "profile_contacts_own_write" on profile_contacts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- column privacy on profiles ----------
revoke select on profiles from anon, authenticated;
grant select (
  id, display_name, locale, avatar_url, role, created_at,
  business_name, logo_url, profile_type, bio, onboarding_completed_at
) on profiles to anon, authenticated;

-- Application form's type choices now match the directory types.
alter table promoter_applications drop constraint if exists promoter_applications_business_type_check;

-- Reload PostgREST's schema cache (new column privileges / table). If it
-- doesn't take effect, restart the project from the dashboard.
notify pgrst, 'reload schema';

-- Lets each event show who posted it: a business name + logo under every
-- promoter-submitted event, on both the card and detail page.
--
-- Note: unlike the UAE app, this repo's database has no promoter_applications
-- table (that flow was never fully migrated here), so there's no application
-- data to backfill business_name from -- promoters set it themselves via the
-- new Business Profile form on /promoter instead.

alter table profiles add column if not exists business_name text;
alter table profiles add column if not exists logo_url text;

-- profiles_self_select (0001) only lets a user read their OWN row, so an
-- anonymous visitor browsing events couldn't see a promoter's business_name
-- /logo_url at all. Promoter identity is meant to be public-facing on their
-- own listings, so expose promoter rows specifically -- regular users'
-- profiles stay private (no matching policy for role='user').
drop policy if exists "profiles_public_promoter_read" on profiles;
create policy "profiles_public_promoter_read" on profiles for select using (role = 'promoter');

-- events.user_id targets auth.users, which PostgREST can't embed through
-- (that schema isn't exposed to it). Retarget to profiles(id) so
-- `profiles!events_user_id_fkey(...)` can be embedded directly in an events
-- select.
do $$
declare
  target text;
begin
  select confrelid::regclass::text into target
  from pg_constraint
  where conname = 'events_user_id_fkey';

  if target is null then
    alter table events
      add constraint events_user_id_fkey
      foreign key (user_id) references profiles(id) on delete set null;
  elsif target <> 'profiles' then
    alter table events drop constraint events_user_id_fkey;
    alter table events
      add constraint events_user_id_fkey
      foreign key (user_id) references profiles(id) on delete set null;
  end if;
end $$;

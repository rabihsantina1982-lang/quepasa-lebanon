-- More Connect directory types, so coaches, yoga teachers, speakers,
-- athletes, chefs and community groups who post events fit somewhere.
-- Safe to re-run.

alter table profiles drop constraint if exists profiles_profile_type_check;
alter table profiles add constraint profiles_profile_type_check
  check (profile_type in (
    'artist', 'dj', 'coach', 'expert', 'athlete', 'chef',
    'organizer', 'promoter', 'venue', 'business', 'community'
  ));

notify pgrst, 'reload schema';

-- Organisers directory: the real organiser behind each event (promoter, venue,
-- artist management, festival office, gallery…), not the ticket website it is
-- sold on. Built up by admins while importing events, so that after launch each
-- organiser can be invited (one private link sent to their official contact) to
-- claim and edit their events.
--
-- Contact details are business contacts copied from the organiser's OWN public
-- page (contact_source_url). Admin-only: no public read access.
--
-- Idempotent (safe to re-run).

create table if not exists organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'other' check (kind in ('promoter', 'venue', 'artist_management', 'festival', 'institution', 'gallery', 'club', 'brand', 'other')),
  website text,
  email text,
  phone text,
  whatsapp text,
  instagram text,
  contact_source_url text,          -- official page where the contact was found
  city text,
  region text,                      -- emirate / governorate slug
  notes text,
  contact_status text not null default 'not_contacted' check (contact_status in ('not_contacted', 'invited', 'claimed', 'declined', 'unsubscribed')),
  invited_at timestamptz,
  claimed_by uuid references profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organizers_name_key on organizers (lower(name));
create index if not exists organizers_status_idx on organizers (contact_status);

alter table events add column if not exists organizer_id uuid references organizers(id) on delete set null;
create index if not exists events_organizer_idx on events (organizer_id);

alter table organizers enable row level security;

drop policy if exists "organizers_admin_all" on organizers;
create policy "organizers_admin_all" on organizers for all using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';

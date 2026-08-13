-- QuePasa Lebanon initial schema.
-- Run via Supabase CLI:  supabase db push
-- or paste into the SQL editor in the Supabase dashboard.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type event_status as enum ('draft','pending','published','rejected');
create type media_kind as enum ('image','video');
create type media_provider as enum ('upload','youtube','vimeo');
create type user_role as enum ('user','admin');

-- ---------- profiles ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text default 'en',
  avatar_url text,
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- categories ----------
create table categories (
  id serial primary key,
  slug text unique not null,
  name_i18n jsonb not null,
  icon text
);

insert into categories (slug, name_i18n, icon) values
  ('live_music',   '{"en":"Live Music","ar":"موسيقى حية","fr":"Musique live"}'::jsonb, '🎸'),
  ('dj_performance','{"en":"DJ Performance","ar":"عرض دي جي","fr":"Set DJ"}'::jsonb, '🎧'),
  ('sports',       '{"en":"Sports","ar":"رياضة","fr":"Sports"}'::jsonb, '⚽'),
  ('food_drink',   '{"en":"Food & Drink","ar":"طعام وشراب","fr":"Gastronomie"}'::jsonb, '🍽'),
  ('arts_culture', '{"en":"Arts & Culture","ar":"فنون وثقافة","fr":"Arts et culture"}'::jsonb, '🎭'),
  ('family_kids',  '{"en":"Family & Kids","ar":"عائلة وأطفال","fr":"Famille et enfants"}'::jsonb, '👨‍👩‍👧'),
  ('nightlife',    '{"en":"Nightlife","ar":"حياة ليلية","fr":"Vie nocturne"}'::jsonb, '🌙'),
  ('business',     '{"en":"Business","ar":"أعمال","fr":"Affaires"}'::jsonb, '💼'),
  ('wellness',     '{"en":"Wellness","ar":"عافية","fr":"Bien-être"}'::jsonb, '🧘'),
  ('festivals',    '{"en":"Festivals","ar":"مهرجانات","fr":"Festivals"}'::jsonb, '🎪'),
  ('conferences',  '{"en":"Conferences","ar":"مؤتمرات","fr":"Conférences"}'::jsonb, '🎤'),
  ('workshops',    '{"en":"Workshops","ar":"ورش عمل","fr":"Ateliers"}'::jsonb, '🛠'),
  ('exhibitions',  '{"en":"Exhibitions","ar":"معارض","fr":"Expositions"}'::jsonb, '🖼'),
  ('outdoor',      '{"en":"Outdoor","ar":"في الهواء الطلق","fr":"Plein air"}'::jsonb, '🌳'),
  ('religious',    '{"en":"Religious","ar":"ديني","fr":"Religieux"}'::jsonb, '🕌'),
  ('charity',      '{"en":"Charity","ar":"خيرية","fr":"Charité"}'::jsonb, '❤️');

-- ---------- venues ----------
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  city text not null default 'Beirut',
  area text
);

-- ---------- events ----------
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_i18n jsonb not null,
  description_i18n jsonb not null default '{}'::jsonb,
  category_id int references categories(id) on delete set null,
  venue_id uuid references venues(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Asia/Beirut',
  cover_image text,
  cover_video text,
  price_min numeric(10,2),
  price_max numeric(10,2),
  currency text not null default 'USD',
  ticket_url text,
  booking_phone text,
  status event_status not null default 'draft',
  source text not null default 'admin',
  source_url text,
  governorate text,
  created_by uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_url)
);
create index events_status_starts_idx on events (status, starts_at);
create index events_category_idx on events (category_id);

-- ---------- event_media ----------
create table event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  kind media_kind not null,
  url text not null,
  provider media_provider not null default 'upload',
  thumbnail_url text,
  alt_i18n jsonb,
  position int not null default 0,
  width int, height int, duration_seconds int
);
create index event_media_event_idx on event_media (event_id, position);

-- ---------- favorites ----------
create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------- reminders ----------
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'email',
  sent_at timestamptz
);
create index reminders_due_idx on reminders (remind_at) where sent_at is null;

-- ---------- ingestion_runs ----------
create table ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted int not null default 0,
  updated int not null default 0,
  errors text
);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table events enable row level security;
alter table event_media enable row level security;
alter table favorites enable row level security;
alter table reminders enable row level security;
alter table venues enable row level security;
alter table categories enable row level security;
alter table ingestion_runs enable row level security;

create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);

create policy "categories_public_read" on categories for select using (true);
create policy "venues_public_read" on venues for select using (true);

create policy "events_public_read_published" on events for select using (status = 'published');
create policy "events_owner_read" on events for select using (auth.uid() = created_by);
create policy "events_insert_authenticated" on events for insert with check (auth.uid() is not null and (status = 'pending' or status = 'draft'));
create policy "events_owner_update" on events for update using (auth.uid() = created_by);
create policy "events_admin_all" on events for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (true);

create policy "event_media_public_read" on event_media for select using (
  exists (select 1 from events e where e.id = event_media.event_id and (e.status = 'published' or e.created_by = auth.uid()))
);
create policy "event_media_admin_write" on event_media for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (true);

create policy "favorites_owner" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_owner" on reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ingestion_runs_admin" on ingestion_runs for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (true);

-- QuePasa Dubai initial schema.
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
  ('music',        '{"en":"Music","ar":"موسيقى","hi":"संगीत","ur":"موسیقی","ru":"Музыка"}'::jsonb, '🎵'),
  ('sports',       '{"en":"Sports","ar":"رياضة","hi":"खेल","ur":"کھیل","ru":"Спорт"}'::jsonb, '⚽'),
  ('food_drink',   '{"en":"Food & Drink","ar":"مأكولات ومشروبات","hi":"खाना और पेय","ur":"کھانا و مشروبات","ru":"Еда и напитки"}'::jsonb, '🍽'),
  ('arts_culture', '{"en":"Arts & Culture","ar":"فنون وثقافة","hi":"कला और संस्कृति","ur":"فن و ثقافت","ru":"Искусство"}'::jsonb, '🎭'),
  ('family_kids',  '{"en":"Family & Kids","ar":"العائلة والأطفال","hi":"परिवार","ur":"خاندان","ru":"Семья"}'::jsonb, '👨‍👩‍👧'),
  ('nightlife',    '{"en":"Nightlife","ar":"حياة ليلية","hi":"नाइटलाइफ़","ur":"نائٹ لائف","ru":"Ночная жизнь"}'::jsonb, '🌙'),
  ('business',     '{"en":"Business","ar":"أعمال","hi":"व्यवसाय","ur":"کاروبار","ru":"Бизнес"}'::jsonb, '💼'),
  ('wellness',     '{"en":"Wellness","ar":"صحة","hi":"वेलनेस","ur":"صحت","ru":"Здоровье"}'::jsonb, '🧘'),
  ('festivals',    '{"en":"Festivals","ar":"مهرجانات","hi":"त्योहार","ur":"میلے","ru":"Фестивали"}'::jsonb, '🎪'),
  ('conferences',  '{"en":"Conferences","ar":"مؤتمرات","hi":"सम्मेलन","ur":"کانفرنسز","ru":"Конференции"}'::jsonb, '🎤'),
  ('workshops',    '{"en":"Workshops","ar":"ورش عمل","hi":"वर्कशॉप","ur":"ورکشاپس","ru":"Мастер-классы"}'::jsonb, '🛠'),
  ('exhibitions',  '{"en":"Exhibitions","ar":"معارض","hi":"प्रदर्शनी","ur":"نمائشیں","ru":"Выставки"}'::jsonb, '🖼'),
  ('outdoor',      '{"en":"Outdoor","ar":"في الهواء الطلق","hi":"आउटडोर","ur":"آؤٹ ڈور","ru":"На воздухе"}'::jsonb, '🌳'),
  ('religious',    '{"en":"Religious","ar":"دينية","hi":"धार्मिक","ur":"مذہبی","ru":"Религия"}'::jsonb, '🕌'),
  ('charity',      '{"en":"Charity","ar":"خيرية","hi":"चैरिटी","ur":"خیراتی","ru":"Благотворительность"}'::jsonb, '❤️');

-- ---------- venues ----------
create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  city text not null default 'Dubai',
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
  timezone text not null default 'Asia/Dubai',
  cover_image text,
  cover_video text,
  price_min numeric(10,2),
  price_max numeric(10,2),
  currency text not null default 'AED',
  ticket_url text,
  booking_phone text,
  status event_status not null default 'draft',
  source text not null default 'admin',
  source_url text,
  created_by uuid references auth.users(id) on delete set null,
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

-- ---------- sample seed (optional, comment out in prod) ----------
do $$
declare
  v1 uuid; v2 uuid; e1 uuid;
begin
  insert into venues (name, address, lat, lng, area)
    values ('Coca-Cola Arena', 'City Walk, Al Wasl', 25.2087, 55.2628, 'City Walk')
    returning id into v1;
  insert into venues (name, address, lat, lng, area)
    values ('Dubai Opera', 'Sheikh Mohammed bin Rashid Blvd', 25.1936, 55.2731, 'Downtown')
    returning id into v2;

  insert into events (slug, title_i18n, description_i18n, category_id, venue_id, starts_at, ends_at, cover_image, price_min, price_max, ticket_url, status, source)
  values
    ('sample-rock-night', '{"en":"Rock Night at the Arena","ar":"ليلة الروك في الأرينا"}',
      '{"en":"A high-energy rock concert featuring local and international acts."}',
      (select id from categories where slug='music'), v1,
      now() + interval '3 days', now() + interval '3 days 3 hours',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200',
      150, 600, 'https://example.com/tickets', 'published', 'admin')
    returning id into e1;

  insert into events (slug, title_i18n, description_i18n, category_id, venue_id, starts_at, cover_image, price_min, status, source)
  values
    ('opera-night', '{"en":"An Evening at Dubai Opera","ar":"أمسية في دار أوبرا دبي"}',
      '{"en":"Classical works performed by the city orchestra."}',
      (select id from categories where slug='arts_culture'), v2,
      now() + interval '6 days',
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200',
      200, 'published', 'admin');
end $$;

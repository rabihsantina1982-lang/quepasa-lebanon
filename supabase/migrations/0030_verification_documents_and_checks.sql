-- Stronger organiser verification.
--
--  * verification-docs: a PRIVATE storage bucket. An organiser can upload into
--    and read only their own folder (<user id>/...); admins can read all.
--  * verification_documents: one row per uploaded file (trade licence, event
--    permit, ID...), with the admin's decision.
--  * promoter_applications.checks: the admin checklist (Instagram code seen,
--    phone confirmed, website/email match, documents checked), each with who
--    ticked it and when.
--
-- Every statement is idempotent (safe to re-run).

-- ---------- private bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "verification_docs_owner_insert" on storage.objects;
create policy "verification_docs_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "verification_docs_read" on storage.objects;
create policy "verification_docs_read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

drop policy if exists "verification_docs_owner_delete" on storage.objects;
create policy "verification_docs_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- ---------- uploaded documents ----------
create table if not exists verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('trade_licence', 'event_permit', 'id', 'other')),
  path text not null,
  file_name text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists verification_documents_user_idx on verification_documents (user_id);

alter table verification_documents enable row level security;

-- Owners add their own files (always as pending) and see their own list.
drop policy if exists "verification_documents_owner_insert" on verification_documents;
create policy "verification_documents_owner_insert" on verification_documents for insert
  with check (auth.uid() = user_id and status = 'pending' and reviewed_at is null
              and split_part(path, '/', 1) = auth.uid()::text);

drop policy if exists "verification_documents_owner_select" on verification_documents;
create policy "verification_documents_owner_select" on verification_documents for select
  using (auth.uid() = user_id);

drop policy if exists "verification_documents_admin_all" on verification_documents;
create policy "verification_documents_admin_all" on verification_documents for all
  using (is_admin()) with check (is_admin());

-- ---------- admin checklist ----------
alter table promoter_applications add column if not exists checks jsonb not null default '{}'::jsonb;

-- Applicants create their own application, but can't pre-tick the checklist
-- or mark it reviewed.
drop policy if exists "promoter_applications_owner_insert" on promoter_applications;
create policy "promoter_applications_owner_insert" on promoter_applications for insert
  with check (auth.uid() = user_id and status = 'pending' and checks = '{}'::jsonb);

notify pgrst, 'reload schema';

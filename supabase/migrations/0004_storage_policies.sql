-- Storage RLS for the event-media bucket (public bucket created via Supabase
-- Storage API, not SQL — bucket creation isn't part of a migration).
-- Ported from the UAE app's live setup (was never captured in a migration
-- there either — this file exists so it's reproducible here going forward).

create policy "event_media_public_read" on storage.objects for select using (
  bucket_id = 'event-media'
);

create policy "event_media_owner_upload" on storage.objects for insert with check (
  bucket_id = 'event-media'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[2]
);

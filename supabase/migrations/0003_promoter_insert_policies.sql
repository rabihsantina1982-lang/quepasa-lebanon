-- Promoters/admins can create venues from the "post a new event" form.
create policy "venues_insert_promoter" on venues for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('promoter', 'admin'))
);

-- Event owners (not just admins) can attach media to their own events.
create policy "event_media_owner_insert" on event_media for insert with check (
  exists (select 1 from events e where e.id = event_media.event_id and (e.user_id = auth.uid() or e.created_by = auth.uid()))
);

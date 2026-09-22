-- Capture the locale the reminder was set in, so the reminder email can be
-- sent in the same language the user was browsing in.
alter table reminders add column if not exists locale text not null default 'en';

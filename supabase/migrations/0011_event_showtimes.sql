-- Shows that run on several dates/times (e.g. a musical's nightly
-- performances) are stored as ONE event, with each performance listed here,
-- instead of one near-identical event per performance cluttering the list.
-- Each entry: { "starts_at": timestamptz, "ends_at": timestamptz|null,
-- "ticket_url": text|null }. Empty for normal single-date events.
alter table events add column if not exists showtimes jsonb not null default '[]'::jsonb;

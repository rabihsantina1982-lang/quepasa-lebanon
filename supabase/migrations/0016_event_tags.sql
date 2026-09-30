-- Sub-filters within a category (e.g. Live Music -> jazz, arabic, rock).
-- Tag slugs and their translated labels live in src/lib/tags.ts.
alter table events add column if not exists tags text[] not null default '{}';
create index if not exists events_tags_idx on events using gin (tags);

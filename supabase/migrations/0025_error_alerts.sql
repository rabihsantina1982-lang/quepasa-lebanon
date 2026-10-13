-- Error alert throttle (src/lib/alerts.ts): one row per kind of problem, so
-- admins get at most one email per problem every few hours. Server only:
-- RLS on with no policies, so only the service role can read or write it.
create table if not exists error_alerts (
  key text primary key,
  last_sent_at timestamptz not null default now(),
  count int not null default 1,
  last_message text
);

alter table error_alerts enable row level security;

notify pgrst, 'reload schema';

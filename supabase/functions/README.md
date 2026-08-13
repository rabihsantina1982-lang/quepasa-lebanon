# Supabase Edge Functions

Two function families live here:

## Ingestion adapters
Each adapter exports an `Adapter` implementing:
```ts
interface Adapter {
  name: string;
  fetch(since: Date): Promise<NormalizedEvent[]>;
}
```
The shared `upsertEvent()` helper dedupes on `(source, source_url)`.

Planned adapters: `ingest-eventbrite` (official API — start here), plus additional Lebanon-focused ticketing/listing sources to be identified.

> Respect each source's robots.txt and Terms of Service. Prefer official APIs.
> Scraping adapters MUST be reviewed by the project owner before enabling in production.

Cron is wired via `pg_cron` in Supabase Studio:
```sql
select cron.schedule('ingest-eventbrite-hourly', '0 * * * *',
  $$select net.http_post(url := 'https://<project>.functions.supabase.co/ingest-eventbrite', headers := '{"Authorization":"Bearer <anon>"}'::jsonb)$$);
```

## send-reminders
Runs every 15 min, scans `reminders` where `remind_at <= now() AND sent_at IS NULL`,
sends one email per reminder via Resend (`RESEND_API_KEY`), then sets `sent_at`.

# QuePasa Lebanon

Web app aggregating events happening in Lebanon. Browse by category and date publicly; sign in via social login (Google / Facebook / Apple) to see full details, save favorites, get reminders, and add events to Google Calendar / iCal.

**Stack:** Next.js 16 (App Router, RSC) · TypeScript · Supabase (Postgres + Auth + RLS) · Tailwind CSS v4 · next-intl (en/ar/fr, RTL) · Mapbox · `ics`.

## Getting started

```bash
npm install
cp .env.local.example .env.local
# fill in Supabase + Mapbox + Resend keys
npm run dev
```

Open http://localhost:3000 — the proxy will redirect to `/en`.

### Supabase setup
1. Create a project at https://supabase.com.
2. Apply the schema: paste `supabase/migrations/0001_init.sql` (then `0002`, `0003`) into the SQL editor, or run `supabase db push`.
3. Enable Auth providers in Authentication → Providers: Google, Facebook, Apple. Set the redirect URL to `<your-site>/auth/callback`.
4. Copy the project URL and anon/service-role keys into `.env.local`.

### Mapbox
Get a public token at https://account.mapbox.com/ and set `NEXT_PUBLIC_MAPBOX_TOKEN`.

## Routes
- `/[locale]/` — home (featured events).
- `/[locale]/events` — public browse with category chips + date presets + governorate + search.
- `/[locale]/events/[slug]` — details; **auth-gated**.
- `/[locale]/map` — Mapbox view with clustered pins.
- `/[locale]/favorites` — saved events.
- `/[locale]/submit` — user submission form (admin approves).
- `/[locale]/become-a-promoter`, `/[locale]/promoter`, `/[locale]/promoter/new-event` — promoter application + dashboard + event submission.
- `/[locale]/admin` — admin queue (role-gated).
- `/auth/callback` — Supabase OAuth callback.
- `/api/ics/[eventId]` — downloads `.ics`.
- `/api/calendar/google/[eventId]` — 302 to Google Calendar template.

## Project structure
```
src/
  app/
    [locale]/         # all localized routes
    auth/callback/    # OAuth return URL
    api/              # ICS + Google Calendar redirects + ingestion
  components/         # UI + feature components
  i18n/               # next-intl routing + navigation helpers
  lib/
    supabase/         # client / server / admin / proxy session refresh
    calendar.ts       # Google Calendar URL + ICS builder
    queries.ts        # server-side event queries
    utils.ts          # cn, date/price formatters, locale picker
  messages/           # en | ar | fr
  proxy.ts            # Next 16 proxy: next-intl + Supabase session refresh
supabase/
  migrations/         # 0001_init, 0002_add_promoter_role, 0003_promoter_insert_policies
  functions/          # Edge functions (ingestion, reminders) — TODO
```

## Status

Forked from the QuePasa UAE app and adapted for Lebanon: governorates replace emirates, currency is USD, timezone is Asia/Beirut, languages are English/Arabic/French. Auth gating, browse/filter UI, RTL, event detail with media carousel, calendar export, submission flow, promoter subscription system, and admin approval queue all carried over from the UAE app.
**TODO before launch:** wire the social-auth providers in Supabase Studio for this project specifically, seed real Lebanon events, build the `send-reminders` cron function, review French/Arabic translation coverage, and run an accessibility audit.

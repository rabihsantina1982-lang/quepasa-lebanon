# QuePasa Dubai

Web app aggregating events happening in Dubai. Browse by category and date publicly; sign in via social login (Google / Apple / Facebook / X) to see full details, save favorites, get reminders, and add events to Google Calendar / iCal.

**Stack:** Next.js 16 (App Router, RSC) · TypeScript · Supabase (Postgres + Auth + RLS) · Tailwind CSS v4 · next-intl (en/ar/hi/ur/ru, RTL) · Mapbox · `ics`.

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
2. Apply the schema: paste `supabase/migrations/0001_init.sql` into the SQL editor, or run `supabase db push`.
3. Enable Auth providers in Authentication → Providers: Google, Apple, Facebook, Twitter (X). Set the redirect URL to `<your-site>/auth/callback`.
4. Copy the project URL and anon/service-role keys into `.env.local`.

### Mapbox
Get a public token at https://account.mapbox.com/ and set `NEXT_PUBLIC_MAPBOX_TOKEN`.

## Routes
- `/[locale]/` — home (featured events).
- `/[locale]/events` — public browse with category chips + date presets + area + search.
- `/[locale]/events/[slug]` — details; **auth-gated**.
- `/[locale]/map` — Mapbox view with clustered pins.
- `/[locale]/favorites` — saved events.
- `/[locale]/submit` — user submission form (admin approves).
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
    api/              # ICS + Google Calendar redirects
  components/         # UI + feature components
  i18n/               # next-intl routing + navigation helpers
  lib/
    supabase/         # client / server / admin / proxy session refresh
    calendar.ts       # Google Calendar URL + ICS builder
    queries.ts        # server-side event queries
    utils.ts          # cn, date/price formatters, locale picker
  messages/           # en | ar | hi | ur | ru
  proxy.ts            # Next 16 proxy: next-intl + Supabase session refresh
supabase/
  migrations/0001_init.sql
  functions/          # Edge functions (ingestion, reminders) — TODO
```

## Status

This is the v0 scaffold from the approved plan. **Done:** auth gating, browse/filter UI, RTL, event detail with media carousel, calendar export, submission flow, admin approval queue, map view.
**TODO before launch:** wire the four social-auth providers in Supabase Studio (you'll need an Apple Developer account for "Sign in with Apple"), build the Eventbrite ingestion adapter under `supabase/functions/`, build the `send-reminders` cron function, complete Hindi/Urdu/Russian translation review, and run an accessibility audit.

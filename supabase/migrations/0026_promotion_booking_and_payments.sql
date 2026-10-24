-- Booking calendar + card payments for boosts, spotlights and Pro.
--
-- Promoters now pick the dates a boost / spotlight runs (starts_at..ends_at)
-- from a calendar that shows how many places are left each day. They either
-- pay by card (Stripe Checkout) -- the request is created as
-- 'awaiting_payment' and switches itself on once Stripe confirms -- or send a
-- request and pay outside the app ('pending', approved by an admin as before).
-- Card requests are only ever written with the service-role key.
--
-- Every statement is idempotent (safe to re-run).

alter table promotion_requests add column if not exists starts_at timestamptz;
alter table promotion_requests add column if not exists ends_at timestamptz;
alter table promotion_requests add column if not exists amount numeric(10, 2);
alter table promotion_requests add column if not exists currency text;
alter table promotion_requests add column if not exists payment_method text;
alter table promotion_requests add column if not exists stripe_session_id text;
alter table promotion_requests add column if not exists paid_at timestamptz;

alter table promotion_requests drop constraint if exists promotion_requests_payment_method_check;
alter table promotion_requests add constraint promotion_requests_payment_method_check
  check (payment_method is null or payment_method in ('card', 'manual', 'free'));

-- awaiting_payment: sent to Stripe, place held for 30 minutes.
-- cancelled: the promoter left the payment page, or it expired.
alter table promotion_requests drop constraint if exists promotion_requests_status_check;
alter table promotion_requests add constraint promotion_requests_status_check
  check (status in ('pending', 'awaiting_payment', 'approved', 'rejected', 'cancelled'));

create unique index if not exists promotion_requests_stripe_session_idx
  on promotion_requests (stripe_session_id) where stripe_session_id is not null;
create index if not exists promotion_requests_dates_idx on promotion_requests (kind, starts_at, ends_at);

-- Which request a running promotion came from (for receipts / admin view).
alter table event_promotions add column if not exists request_id uuid references promotion_requests(id) on delete set null;
create index if not exists event_promotions_kind_dates_idx on event_promotions (kind, starts_at, ends_at);

-- Promoters may still insert their own pay-later / free requests, but can't
-- mark anything as paid by card.
drop policy if exists "promotion_requests_owner_insert" on promotion_requests;
create policy "promotion_requests_owner_insert" on promotion_requests for insert with check (
  auth.uid() = user_id
  and status = 'pending'
  and (payment_method is null or payment_method in ('manual', 'free'))
  and stripe_session_id is null
  and paid_at is null
  and (event_id is null or exists (select 1 from events e where e.id = event_id and e.user_id = auth.uid()))
);

notify pgrst, 'reload schema';

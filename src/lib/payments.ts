// Ordering boosts / spotlights / Pro: checking an order, sending the promoter
// to Stripe's payment page, and switching the order on once Stripe says it's
// paid (from the webhook or from the page the promoter lands on afterwards,
// whichever comes first). Server-only.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PRICING, unitPrice, price, type PaidKind } from "./pricing";
import { isDayKey, bookingPeriod } from "./bookingDays";
import { checkBooking, eventLastDay, activateRequest, type ActivatableRequest } from "./promotionBooking";
import { getStripe } from "./stripe";
import { emailAdmins } from "./duplicateCheck";
import { alertAdmins } from "./alerts";
import { APP_TIMEZONE } from "./dates";

const KINDS: PaidKind[] = ["boost", "spotlight", "pro"];
export const KIND_LABEL: Record<PaidKind, string> = { boost: "Boost", spotlight: "Homepage spotlight", pro: "Pro" };

export interface Order {
  kind: PaidKind;
  duration: number; // weeks (boost/spotlight) or months (pro)
  eventId: string | null;
  eventTitle: string | null;
  startKey: string | null;
  start: Date | null;
  end: Date | null;
  amount: number;
  pro: boolean; // the promoter currently has Pro
}

type Result = { order: Order } | { error: string; status: number };

const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: APP_TIMEZONE });

// Validate what a promoter asked for. Works out dates and price on the server.
export async function prepareOrder(admin: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Result> {
  const { data: profile } = await admin.from("profiles").select("role, pro_until, suspended_at").eq("id", userId).single();
  if (profile?.role !== "promoter" && profile?.role !== "admin") return { error: "Promoters only", status: 403 };
  if (profile.suspended_at) return { error: "Your account is suspended.", status: 403 };

  const kind = body.kind as PaidKind;
  const duration = Number(body.duration);
  const eventId = typeof body.eventId === "string" ? body.eventId : null;
  if (!KINDS.includes(kind) || !Number.isInteger(duration) || duration < 1 || duration > 12) {
    return { error: "Invalid request", status: 400 };
  }
  if ((kind === "pro") !== (eventId === null)) return { error: "Invalid request", status: 400 };

  const pro = !!profile.pro_until && new Date(profile.pro_until) > new Date();
  const order: Order = { kind, duration, eventId, eventTitle: null, startKey: null, start: null, end: null, amount: unitPrice(kind) * duration, pro };
  if (kind === "pro") return { order };

  const { data: event } = await admin
    .from("events")
    .select("id, title_i18n, slug, status, starts_at, ends_at, showtimes")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!event) return { error: "Event not found", status: 404 };
  if (event.status !== "published") return { error: "You can promote this event once it's published.", status: 400 };
  const lastDay = eventLastDay(event);

  const startKey = body.startDate;
  if (!isDayKey(startKey)) return { error: "Pick a start date on the calendar.", status: 400 };
  const problem = await checkBooking(admin, kind, event.id, startKey, duration, lastDay);
  if (problem) return { error: problem, status: 409 };

  const { start, end } = bookingPeriod(startKey, duration);
  order.eventTitle = (event.title_i18n as Record<string, string>)?.en ?? event.slug;
  order.startKey = startKey;
  order.start = start;
  order.end = end;
  return { order };
}

// What the promoter sees on the payment page and their receipt.
export function orderDescription(o: Order): string {
  const unit = o.kind === "pro" ? "month" : "week";
  const length = `${o.duration} ${unit}${o.duration > 1 ? "s" : ""}`;
  if (!o.start || !o.end) return `${KIND_LABEL[o.kind]}, ${length}`;
  const lastDay = new Date(o.end.getTime() - 1);
  return `${KIND_LABEL[o.kind]}, ${length}: ${fmtDay(o.start)} to ${fmtDay(lastDay)}`;
}

// Create the request (holding the dates) and a Stripe payment page for it.
export async function createCheckout(
  admin: SupabaseClient,
  user: { id: string; email?: string | null },
  order: Order,
  returnBase: string
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Card payments aren't switched on yet." };

  const { data: request, error } = await admin
    .from("promotion_requests")
    .insert({
      user_id: user.id,
      event_id: order.eventId,
      kind: order.kind,
      duration: order.duration,
      status: "awaiting_payment",
      payment_method: "card",
      amount: order.amount,
      currency: PRICING.currencyCode,
      starts_at: order.start?.toISOString() ?? null,
      ends_at: order.end?.toISOString() ?? null,
    })
    .select("id")
    .single();
  if (error || !request) return { error: "Couldn't start the payment. Please try again." };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: request.id,
      customer_email: user.email ?? undefined,
      metadata: { request_id: request.id, user_id: user.id },
      payment_intent_data: { metadata: { request_id: request.id } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PRICING.currencyCode,
            unit_amount: Math.round(order.amount * 100),
            product_data: {
              name: order.eventTitle ? `${KIND_LABEL[order.kind]}: ${order.eventTitle}` : `QuePasa ${KIND_LABEL[order.kind]}`,
              description: orderDescription(order),
            },
          },
        },
      ],
      success_url: `${returnBase}?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnBase}?cancelled=${request.id}`,
      // Shortest Stripe allows; the dates stay held meanwhile.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    });
    await admin.from("promotion_requests").update({ stripe_session_id: session.id }).eq("id", request.id);
    if (!session.url) throw new Error("No checkout URL");
    return { url: session.url };
  } catch (e) {
    await admin.from("promotion_requests").update({ status: "cancelled" }).eq("id", request.id);
    await alertAdmins("payment:checkout", "Card payment couldn't start", e instanceof Error ? e.message : String(e));
    return { error: "Couldn't start the payment. Please try again." };
  }
}

export type FinalizeResult =
  | { status: "activated"; description: string }
  | { status: "already"; description: string }
  | { status: "unpaid" }
  | { status: "unknown" };

const REQUEST_FIELDS = "id, user_id, event_id, kind, duration, starts_at, ends_at, amount, status, events(title_i18n, slug)";

// Called by the webhook and by the dashboard after Stripe sends the promoter
// back. Only the first call switches the order on.
export async function finalizeCheckout(admin: SupabaseClient, sessionId: string, userId?: string): Promise<FinalizeResult> {
  const stripe = getStripe();
  if (!stripe || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { status: "unknown" };

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { status: "unknown" };
  }
  const requestId = session.metadata?.request_id;
  if (!requestId || (userId && session.metadata?.user_id !== userId)) return { status: "unknown" };
  if (session.payment_status !== "paid") return { status: "unpaid" };

  const now = new Date().toISOString();
  const { data: claimed } = await admin
    .from("promotion_requests")
    .update({ status: "approved", paid_at: now, reviewed_at: now })
    .eq("id", requestId)
    .eq("stripe_session_id", sessionId)
    .in("status", ["awaiting_payment", "cancelled"])
    .select(REQUEST_FIELDS)
    .maybeSingle();

  type Row = ActivatableRequest & { amount: number | null; events: { title_i18n: Record<string, string>; slug: string } | null };
  if (!claimed) {
    const { data: done } = await admin.from("promotion_requests").select(REQUEST_FIELDS).eq("id", requestId).maybeSingle();
    return done ? { status: "already", description: describeRow(done as unknown as Row) } : { status: "unknown" };
  }

  const row = claimed as unknown as Row;
  const problem = await activateRequest(admin, row);
  const description = describeRow(row);
  if (problem) {
    await alertAdmins(`payment:activate:${row.id}`, "Paid order didn't switch on", `${description}\nRequest ${row.id}\n${problem}`);
  }
  const amount = row.amount != null ? price(Number(row.amount)) : "";
  await emailAdmins(
    admin,
    `Card payment: ${description} (${amount})`,
    `<p>A promoter paid by card and it switched on automatically.</p><p><strong>${esc(description)}</strong><br>${esc(amount)}</p>`
  );
  return { status: "activated", description };
}

function describeRow(r: ActivatableRequest & { events: { title_i18n: Record<string, string>; slug: string } | null }): string {
  const title = r.events ? ` for ${r.events.title_i18n?.en ?? r.events.slug}` : "";
  const unit = r.kind === "pro" ? "month" : "week";
  const length = `${r.duration} ${unit}${r.duration > 1 ? "s" : ""}`;
  const dates = r.starts_at && r.ends_at ? `, ${fmtDay(new Date(r.starts_at))} to ${fmtDay(new Date(new Date(r.ends_at).getTime() - 1))}` : "";
  return `${KIND_LABEL[r.kind]}${title}, ${length}${dates}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// The promoter left the payment page: free the dates and close the page.
export async function cancelCheckout(admin: SupabaseClient, requestId: string, userId?: string): Promise<void> {
  let q = admin
    .from("promotion_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("status", "awaiting_payment");
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q.select("stripe_session_id").maybeSingle();
  const sessionId = data?.stripe_session_id;
  const stripe = getStripe();
  if (sessionId && stripe) {
    await stripe.checkout.sessions.expire(sessionId).catch(() => {});
  }
}


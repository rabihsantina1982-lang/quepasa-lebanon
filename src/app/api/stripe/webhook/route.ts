/**
 * POST /api/stripe/webhook
 * Stripe tells us here when a payment page is paid or expires. Signed with
 * STRIPE_WEBHOOK_SECRET; set the endpoint up in Stripe (Developers → Webhooks)
 * for checkout.session.completed, checkout.session.async_payment_succeeded
 * and checkout.session.expired.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { finalizeCheckout, cancelCheckout } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await finalizeCheckout(admin, event.data.object.id);
  } else if (event.type === "checkout.session.expired") {
    const requestId = event.data.object.metadata?.request_id;
    if (requestId) await cancelCheckout(admin, requestId);
  }
  return NextResponse.json({ received: true });
}

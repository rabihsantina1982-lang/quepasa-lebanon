/**
 * POST /api/promoter/checkout
 * Body: { kind: "boost" | "spotlight" | "pro", eventId?: string, duration: number, startDate?: "YYYY-MM-DD", locale?: string }
 * Holds the chosen dates and returns a Stripe payment page URL. Once paid,
 * the boost / spotlight / Pro switches on by itself (see src/lib/payments.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prepareOrder, createCheckout } from "@/lib/payments";
import { cardPaymentsEnabled } from "@/lib/stripe";
import { locales } from "@/i18n/routing";

export async function POST(req: NextRequest) {
  if (!cardPaymentsEnabled()) return NextResponse.json({ error: "Card payments aren't switched on yet." }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const result = await prepareOrder(admin, user.id, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const locale = (locales as readonly string[]).includes(body.locale) ? body.locale : "en";
  const checkout = await createCheckout(admin, user, result.order, `${req.nextUrl.origin}/${locale}/promoter`);
  if ("error" in checkout) return NextResponse.json({ error: checkout.error }, { status: 502 });
  return NextResponse.json({ url: checkout.url });
}
